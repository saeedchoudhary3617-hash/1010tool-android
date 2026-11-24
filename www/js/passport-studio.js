/**
 * 1010 Tools — Passport & ID Photo Studio (v2.7.0)
 * 100% On-Device Processing · Zero Photo Uploads
 */
(function (global) {
    'use strict';

    const PREFS_KEY = '1010_passport_prefs';
    const MEDIAPIPE_VERSION = '0.10.14';
    const MEDIAPIPE_BUNDLE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
    const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
    const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
    const SELFIE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

    const SIZE_GROUPS = [
        {
            group: 'Passport and Visa',
            items: [
                { id: 'eu_35x45', name: '35 × 45 mm', note: 'India visa, UK, EU, Australia', wMm: 35, hMm: 45, labelDims: '35 × 45 mm' },
                { id: 'us_2x2', name: '2 × 2 inch', note: 'USA, Canada, India passport (51 × 51 mm)', wMm: 50.8, hMm: 50.8, labelDims: '2 × 2 in' },
                { id: 'std_30x40', name: '30 × 40 mm', note: 'Standard passport / ID', wMm: 30, hMm: 40, labelDims: '30 × 40 mm' }
            ]
        },
        {
            group: 'ID and Forms',
            items: [
                { id: 'id_35x35', name: 'ID card', note: '35 × 35 mm', wMm: 35, hMm: 35, labelDims: '35 × 35 mm' },
                { id: 'aadhaar_25x30', name: 'Aadhaar / small ID', note: '25 × 30 mm', wMm: 25, hMm: 30, labelDims: '25 × 30 mm' },
                { id: 'pan_25x35', name: 'PAN', note: '25 × 35 mm', wMm: 25, hMm: 35, labelDims: '25 × 35 mm' },
                { id: 'stamp_20x25', name: 'Stamp', note: '20 × 25 mm', wMm: 20, hMm: 25, labelDims: '20 × 25 mm' }
            ]
        },
        {
            group: 'Cards and Badges',
            items: [
                { id: 'card_cr80', name: 'Credit / Debit card', note: '85.6 × 53.98 mm', wMm: 85.6, hMm: 53.98, labelDims: '85.6 × 53.98 mm' },
                { id: 'badge_85x55', name: 'ID badge', note: '85 × 55 mm', wMm: 85, hMm: 55, labelDims: '85 × 55 mm' }
            ]
        }
    ];

    const FLAT_PRESETS = {};
    SIZE_GROUPS.forEach(g => g.items.forEach(item => { FLAT_PRESETS[item.id] = item; }));

    const PAPER_SIZES = {
        a4: { id: 'a4', name: 'A4', wMm: 210, hMm: 297 },
        letter: { id: 'letter', name: 'Letter', wMm: 215.9, hMm: 279.4 },
        '4x6': { id: '4x6', name: '4 × 6 in', wMm: 101.6, hMm: 152.4 },
        '5x7': { id: '5x7', name: '5 × 7 in', wMm: 127, hMm: 177.8 }
    };

    const BG_SWATCHES = [
        { id: 'white', label: 'White', hex: '#FFFFFF' },
        { id: 'lightgrey', label: 'Light grey', hex: '#E5E7EB' },
        { id: 'lightblue', label: 'Light blue', hex: '#DCEEFB' },
        { id: 'blue', label: 'Blue', hex: '#1D63B8' },
        { id: 'red', label: 'Red', hex: '#C81E1E' }
    ];

    const CAPTION_HEIGHT_MM = 5.5;

    // =====================================================
    // PURE MATH HELPERS (also exposed for self-check tests)
    // =====================================================

    function unitToMm(val, unit) {
        const n = parseFloat(val);
        if (!Number.isFinite(n) || n <= 0) return 35;
        if (unit === 'cm') return n * 10;
        if (unit === 'inch' || unit === 'in') return n * 25.4;
        return n;
    }

    function mmToPx(mm, dpi) {
        return Math.max(1, Math.round((mm / 25.4) * dpi));
    }

    function mmToPt(mm) {
        return (mm / 25.4) * 72;
    }

    function calcOutputPixels(wMm, hMm, dpi) {
        return {
            w: mmToPx(wMm, dpi),
            h: mmToPx(hMm, dpi)
        };
    }

    function calcSheetLayout(opts) {
        const paper = PAPER_SIZES[opts.paper] || PAPER_SIZES.a4;
        const photoW = Math.max(5, Number(opts.photoWMm) || 35);
        const photoH = Math.max(5, Number(opts.photoHMm) || 45);
        const margin = Math.max(0, Number(opts.marginMm) || 0);
        const gap = Math.max(0, Number(opts.gapMm) || 0);
        const captionH = opts.hasCaption ? CAPTION_HEIGHT_MM : 0;
        const cellW = photoW;
        const cellH = photoH + captionH;

        const solveFor = (pW, pH, orientName) => {
            const availW = Math.max(0, pW - margin * 2);
            const availH = Math.max(0, pH - margin * 2);
            const cols = availW >= cellW - 1e-6 ? Math.floor((availW + gap + 1e-6) / (cellW + gap)) : 0;
            const rows = availH >= cellH - 1e-6 ? Math.floor((availH + gap + 1e-6) / (cellH + gap)) : 0;
            return {
                paperId: paper.id,
                paperName: paper.name,
                orientation: orientName,
                paperWMm: pW,
                paperHMm: pH,
                cols,
                rows,
                maxCount: cols * rows,
                cellW,
                cellH,
                photoW,
                photoH,
                captionH,
                margin,
                gap
            };
        };

        const portrait = solveFor(paper.wMm, paper.hMm, 'Portrait');
        const landscape = solveFor(paper.hMm, paper.wMm, 'Landscape');

        let chosen;
        if (opts.orientation === 'portrait') {
            chosen = portrait;
        } else if (opts.orientation === 'landscape') {
            chosen = landscape;
        } else {
            chosen = landscape.maxCount > portrait.maxCount ? landscape : portrait;
        }

        const requestedCount = opts.countMode === 'custom'
            ? Math.max(1, Math.min(60, Math.round(Number(opts.customCount) || 1)))
            : chosen.maxCount;
        chosen.count = chosen.maxCount > 0 ? Math.min(requestedCount, chosen.maxCount) : 0;
        return chosen;
    }

    // Write exact DPI into JPEG JFIF APP0 segment
    function setJpegDpi(jpegBytes, dpi) {
        const bytes = jpegBytes instanceof Uint8Array ? jpegBytes : new Uint8Array(jpegBytes);
        if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
            return bytes;
        }
        const safeDpi = Math.max(72, Math.min(2400, Math.round(dpi || 300)));
        const hi = (safeDpi >> 8) & 0xFF;
        const lo = safeDpi & 0xFF;

        // Check if existing APP0 JFIF header is right after SOI
        if (
            bytes.length >= 20 &&
            bytes[2] === 0xFF && bytes[3] === 0xE0 &&
            bytes[6] === 0x4A && bytes[7] === 0x46 && bytes[8] === 0x49 && bytes[9] === 0x46 && bytes[10] === 0x00
        ) {
            const copy = new Uint8Array(bytes);
            copy[13] = 0x01; // units = pixels per inch
            copy[14] = hi;
            copy[15] = lo;
            copy[16] = hi;
            copy[17] = lo;
            return copy;
        }

        // Insert a fresh 18-byte JFIF APP0 header right after SOI (FF D8)
        const jfif = new Uint8Array([
            0xFF, 0xE0, 0x00, 0x10,
            0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
            0x01, 0x01,                   // v1.01
            0x01,                         // units: DPI
            hi, lo,                       // Xdensity
            hi, lo,                       // Ydensity
            0x00, 0x00                    // no thumbnail
        ]);
        const out = new Uint8Array(bytes.length + jfif.length);
        out[0] = 0xFF;
        out[1] = 0xD8;
        out.set(jfif, 2);
        out.set(bytes.subarray(2), 2 + jfif.length);
        return out;
    }

    function releaseCanvas(c) {
        if (!c) return;
        try {
            c.width = 0;
            c.height = 0;
        } catch (_) {}
    }

    // =====================================================
    // EXIF ORIENTATION FALLBACK PARSER
    // =====================================================

    function parseExifOrientation(arrayBuffer) {
        try {
            const view = new DataView(arrayBuffer);
            if (view.byteLength < 12 || view.getUint16(0, false) !== 0xFFD8) return 1;
            let offset = 2;
            while (offset + 4 < view.byteLength) {
                const marker = view.getUint16(offset, false);
                offset += 2;
                if (marker === 0xFFE1) {
                    const length = view.getUint16(offset, false);
                    if (offset + 8 > view.byteLength) return 1;
                    if (view.getUint32(offset + 2, false) !== 0x45786966) {
                        offset += length;
                        continue;
                    }
                    const tiffStart = offset + 8;
                    const little = view.getUint16(tiffStart, false) === 0x4949;
                    const firstIfd = view.getUint32(tiffStart + 4, little);
                    const ifdStart = tiffStart + firstIfd;
                    if (ifdStart + 2 > view.byteLength) return 1;
                    const entries = view.getUint16(ifdStart, little);
                    for (let i = 0; i < entries; i++) {
                        const entryOffset = ifdStart + 2 + i * 12;
                        if (entryOffset + 12 > view.byteLength) break;
                        if (view.getUint16(entryOffset, little) === 0x0112) {
                            return view.getUint16(entryOffset + 8, little);
                        }
                    }
                    return 1;
                } else if ((marker & 0xFF00) !== 0xFF00) {
                    break;
                } else {
                    const segLen = view.getUint16(offset, false);
                    if (segLen < 2) break;
                    offset += segLen;
                }
            }
        } catch (_) {}
        return 1;
    }

    function drawWithExifOrientation(img, orientation) {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const swap = orientation >= 5 && orientation <= 8;
        const c = document.createElement('canvas');
        c.width = swap ? h : w;
        c.height = swap ? w : h;
        const ctx = c.getContext('2d');
        switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
            case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
            case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
            case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
            case 7: ctx.transform(0, -1, -1, 0, h, w); break;
            case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
            default: break;
        }
        ctx.drawImage(img, 0, 0);
        return c;
    }

    async function decodeImageRespectingExif(file) {
        // Modern browsers & Android WebView Chromium: createImageBitmap with from-image handles EXIF reliably once
        if (typeof createImageBitmap === 'function') {
            try {
                const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
                const c = document.createElement('canvas');
                c.width = bmp.width;
                c.height = bmp.height;
                const ctx = c.getContext('2d');
                ctx.drawImage(bmp, 0, 0);
                if (typeof bmp.close === 'function') bmp.close();
                return c;
            } catch (_) {
                // Fall through to Image fallback
            }
        }

        const buf = await file.arrayBuffer();
        const url = URL.createObjectURL(file);
        try {
            const img = await new Promise((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error('Could not decode this image file.'));
                el.src = url;
            });
            const autoOrient = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('image-orientation', 'from-image');
            const orientation = autoOrient ? 1 : parseExifOrientation(buf);
            return drawWithExifOrientation(img, orientation);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    function downscaleCanvasIfNeeded(srcCanvas, maxSide) {
        const w = srcCanvas.width;
        const h = srcCanvas.height;
        const longSide = Math.max(w, h);
        if (longSide <= maxSide) {
            const clone = document.createElement('canvas');
            clone.width = w;
            clone.height = h;
            clone.getContext('2d').drawImage(srcCanvas, 0, 0);
            return clone;
        }
        const ratio = maxSide / longSide;
        const out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(w * ratio));
        out.height = Math.max(1, Math.round(h * ratio));
        const ctx = out.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(srcCanvas, 0, 0, out.width, out.height);
        return out;
    }

    // =====================================================
    // MEDIAPIPE LAZY ENGINE
    // =====================================================

    const mp = {
        libPromise: null,
        visionPromise: null,
        faceDetector: null,
        faceDetectorPromise: null,
        faceFailed: false,
        segmenter: null,
        segmenterPromise: null
    };

    async function loadMediaPipeLib() {
        if (!mp.libPromise) {
            mp.libPromise = import(MEDIAPIPE_BUNDLE_URL).catch(err => {
                mp.libPromise = null;
                throw err;
            });
        }
        return mp.libPromise;
    }

    async function loadVisionFileset() {
        if (!mp.visionPromise) {
            mp.visionPromise = (async () => {
                const mod = await loadMediaPipeLib();
                return mod.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
            })().catch(err => {
                mp.visionPromise = null;
                throw err;
            });
        }
        return mp.visionPromise;
    }

    async function getFaceDetector() {
        if (mp.faceDetector) return mp.faceDetector;
        if (!mp.faceDetectorPromise) {
            mp.faceDetectorPromise = (async () => {
                const mod = await loadMediaPipeLib();
                const vision = await loadVisionFileset();
                const detector = await mod.FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: FACE_MODEL_URL,
                        delegate: 'CPU'
                    },
                    runningMode: 'IMAGE'
                });
                mp.faceDetector = detector;
                return detector;
            })().catch(err => {
                mp.faceDetectorPromise = null;
                throw err;
            });
        }
        return mp.faceDetectorPromise;
    }

    async function getImageSegmenter() {
        if (mp.segmenter) return mp.segmenter;
        if (!mp.segmenterPromise) {
            mp.segmenterPromise = (async () => {
                const mod = await loadMediaPipeLib();
                const vision = await loadVisionFileset();
                const seg = await mod.ImageSegmenter.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: SELFIE_MODEL_URL,
                        delegate: 'CPU'
                    },
                    runningMode: 'IMAGE',
                    outputCategoryMask: false,
                    outputConfidenceMasks: true
                });
                mp.segmenter = seg;
                return seg;
            })().catch(err => {
                mp.segmenterPromise = null;
                throw err;
            });
        }
        return mp.segmenterPromise;
    }

    // =====================================================
    // STUDIO STATE
    // =====================================================

    function loadPrefs() {
        const defaults = {
            sizeId: 'eu_35x45',
            customW: 35,
            customH: 45,
            customUnit: 'mm',
            dpi: 300,
            bgColor: '#FFFFFF',
            bgMode: 'original',
            paper: 'a4',
            orientation: 'auto',
            marginMm: 5,
            gapMm: 2,
            border: 'thin'
        };
        try {
            const raw = localStorage.getItem(PREFS_KEY);
            if (!raw) return defaults;
            const parsed = JSON.parse(raw);
            return Object.assign({}, defaults, parsed || {});
        } catch (_) {
            return defaults;
        }
    }

    function savePrefs() {
        try {
            const payload = {
                sizeId: state.sizeId,
                customW: state.customW,
                customH: state.customH,
                customUnit: state.customUnit,
                dpi: state.dpi,
                bgColor: state.bgColor,
                bgMode: state.bgMode,
                paper: state.sheet.paper,
                orientation: state.sheet.orientation,
                marginMm: state.sheet.marginMm,
                gapMm: state.sheet.gapMm,
                border: state.sheet.border
            };
            localStorage.setItem(PREFS_KEY, JSON.stringify(payload));
        } catch (_) {}
    }

    const initPrefs = loadPrefs();

    const state = {
        initialized: false,
        step: 1, // 1=Upload, 2=Edit, 3=Export
        editTab: 'crop', // crop | size | bg | retouch
        exportTab: 'single', // single | sheet

        // Media
        fileName: 'passport-photo',
        originalCanvas: null, // Full-res EXIF-corrected
        workingCanvas: null,  // <= 4000px long side
        previewCanvas: null,  // <= 1200px long side for 60fps preview
        orientedPreviewCanvas: null, // Rot90 + flipH applied to previewCanvas
        compositedPreviewCanvas: null, // Background + retouch applied to orientedPreviewCanvas

        // Transform (relative to oriented image)
        rot90: 0,           // 0, 90, 180, 270
        flipH: false,
        straightenDeg: 0,   // -15 .. +15
        zoomRel: 1.0,       // 1.0 (= min cover) .. 5.0
        panX: 0,            // normalized in frame-widths (-..+)
        panY: 0,            // normalized in frame-heights (-..+)
        showGuides: true,

        // Size & DPI
        sizeId: initPrefs.sizeId || 'eu_35x45',
        customW: Number(initPrefs.customW) || 35,
        customH: Number(initPrefs.customH) || 45,
        customUnit: initPrefs.customUnit || 'mm',
        dpi: [150, 300, 600].includes(Number(initPrefs.dpi)) ? Number(initPrefs.dpi) : 300,

        // Background
        bgMode: ['original', 'plain', 'smart'].includes(initPrefs.bgMode) ? initPrefs.bgMode : 'original',
        bgColor: initPrefs.bgColor || '#FFFFFF',
        plainTolerance: 35, // 10..80
        plainFeather: 2,    // 0..6
        smartThreshold: 0.5, // 0.1..0.9
        smartFeather: 1.5,   // 0..6
        baseMaskCanvas: null, // alpha mask in oriented preview coordinates (0..255 alpha)
        smartRawMask: null,   // { data: Float32Array, width, height, rot90, flipH }
        brushOverrideCanvas: null, // RGBA mask: green=restore, red=erase (alpha = strength)
        brushUndoStack: [],   // ImageData snapshots of brushOverrideCanvas
        brushActive: false,
        brushMode: 'erase',   // erase | restore
        brushSize: 'M',       // S | M | L

        // Retouch
        brightness: 100,
        contrast: 100,
        saturation: 100,
        autoEnhance: false,
        autoLevels: null,     // { p1, p99 }

        // Export: Single
        singleFormat: 'image/jpeg',
        targetKbEnabled: false,
        targetKb: 50,
        lastSingleInfo: '',
        lastSingleWarning: '',

        // Export: Sheet
        sheet: {
            paper: PAPER_SIZES[initPrefs.paper] ? initPrefs.paper : 'a4',
            orientation: ['auto', 'portrait', 'landscape'].includes(initPrefs.orientation) ? initPrefs.orientation : 'auto',
            marginMm: Number.isFinite(Number(initPrefs.marginMm)) ? Number(initPrefs.marginMm) : 5,
            gapMm: Number.isFinite(Number(initPrefs.gapMm)) ? Number(initPrefs.gapMm) : 2,
            countMode: 'fill', // fill | custom
            customCount: 8,
            border: ['none', 'thin', 'cutmarks'].includes(initPrefs.border) ? initPrefs.border : 'thin',
            captionName: '',
            captionDate: false,
            previewZoom: 1.0,
            format: 'pdf' // pdf | jpg | png
        },

        // Viewport runtime geometry
        vp: {
            w: 320,
            h: 320,
            dpr: 1,
            frameX: 60,
            frameY: 20,
            frameW: 200,
            frameH: 257,
            pointers: new Map(),
            isPanning: false,
            isBrushing: false,
            lastPanX: 0,
            lastPanY: 0,
            pinchStartDist: 0,
            pinchStartZoom: 1,
            pinchMidX: 0,
            pinchMidY: 0,
            lastBrushX: 0,
            lastBrushY: 0
        },

        // Cached single processed preview for fast print sheet preview
        sheetThumbCanvas: null,
        sheetThumbDirty: true,
        sheetRenderTimer: null,
        rafPending: false,
        nudgeTimer: null,
        nudgeInterval: null,
        maskRebuildTimer: null
    };

    // =====================================================
    // SIZE & TRANSFORM GEOMETRY
    // =====================================================

    function getSelectedSizeMm() {
        if (state.sizeId === 'custom') {
            const wMm = Math.max(5, Math.min(300, unitToMm(state.customW, state.customUnit)));
            const hMm = Math.max(5, Math.min(300, unitToMm(state.customH, state.customUnit)));
            const uLabel = state.customUnit === 'inch' ? 'in' : state.customUnit;
            return {
                id: 'custom',
                name: 'Custom',
                wMm,
                hMm,
                labelDims: `${trimNum(state.customW)} × ${trimNum(state.customH)} ${uLabel}`
            };
        }
        const preset = FLAT_PRESETS[state.sizeId] || FLAT_PRESETS.eu_35x45;
        return preset;
    }

    function trimNum(n) {
        const num = Number(n);
        if (!Number.isFinite(num)) return '0';
        return Number.isInteger(num) ? String(num) : String(parseFloat(num.toFixed(2)));
    }

    function computeMinCoverScale(imgW, imgH, frameW, frameH, deg) {
        const rad = (deg * Math.PI) / 180;
        const c = Math.abs(Math.cos(rad));
        const s = Math.abs(Math.sin(rad));
        const reqW = frameW * c + frameH * s;
        const reqH = frameW * s + frameH * c;
        return Math.max(reqW / Math.max(1, imgW), reqH / Math.max(1, imgH));
    }

    function clampTransform() {
        const src = state.orientedPreviewCanvas;
        if (!src) return;
        state.zoomRel = Math.max(1.0, Math.min(5.0, state.zoomRel));
        const size = getSelectedSizeMm();
        const aspect = size.wMm / size.hMm;
        // Work in normalized frame coordinates: frameW = aspect, frameH = 1
        const fW = aspect;
        const fH = 1;
        const sMin = computeMinCoverScale(src.width, src.height, fW, fH, state.straightenDeg);
        const s = sMin * state.zoomRel;

        const rad = (state.straightenDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const absCos = Math.abs(cos);
        const absSin = Math.abs(sin);
        const reqW = fW * absCos + fH * absSin;
        const reqH = fW * absSin + fH * absCos;

        // Convert pan from frame units to image-local scaled units
        const panFrameX = state.panX * fW;
        const panFrameY = state.panY * fH;
        // Image center offset in rotated-image coordinates
        const localX = panFrameX * cos + panFrameY * sin;
        const localY = -panFrameX * sin + panFrameY * cos;

        const maxLocalX = Math.max(0, (src.width * s - reqW) / 2);
        const maxLocalY = Math.max(0, (src.height * s - reqH) / 2);

        const clampedLocalX = Math.max(-maxLocalX, Math.min(maxLocalX, localX));
        const clampedLocalY = Math.max(-maxLocalY, Math.min(maxLocalY, localY));

        // Convert back to normalized frame units
        const outFrameX = clampedLocalX * cos - clampedLocalY * sin;
        const outFrameY = clampedLocalX * sin + clampedLocalY * cos;
        state.panX = outFrameX / fW;
        state.panY = outFrameY / fH;
    }

    // =====================================================
    // ORIENTED PREVIEW, MASKING & RETOUCH PIPELINE
    // =====================================================

    function buildOrientedCanvas(sourceCanvas, rot90, flipH) {
        if (!sourceCanvas) return null;
        const normRot = ((rot90 % 360) + 360) % 360;
        const swap = normRot === 90 || normRot === 270;
        const out = document.createElement('canvas');
        out.width = swap ? sourceCanvas.height : sourceCanvas.width;
        out.height = swap ? sourceCanvas.width : sourceCanvas.height;
        const ctx = out.getContext('2d');
        ctx.save();
        ctx.translate(out.width / 2, out.height / 2);
        if (flipH) ctx.scale(-1, 1);
        if (normRot !== 0) ctx.rotate((normRot * Math.PI) / 180);
        ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
        ctx.restore();
        return out;
    }

    function rebuildOrientedPreview() {
        releaseCanvas(state.orientedPreviewCanvas);
        state.orientedPreviewCanvas = buildOrientedCanvas(state.previewCanvas, state.rot90, state.flipH);
        // Reset brush & smart mask when orientation changes
        resetBrushLayer();
        state.smartRawMask = null;
        if (state.bgMode === 'plain') {
            buildPlainWallMask();
        } else if (state.bgMode === 'smart') {
            runSmartCutout(false);
        } else {
            releaseCanvas(state.baseMaskCanvas);
            state.baseMaskCanvas = null;
        }
        computeAutoLevels();
        rebuildCompositedPreview();
    }

    function resetBrushLayer() {
        releaseCanvas(state.brushOverrideCanvas);
        state.brushOverrideCanvas = null;
        state.brushUndoStack = [];
        updateBrushUndoBtn();
    }

    function ensureBrushCanvas() {
        const src = state.orientedPreviewCanvas;
        if (!src) return null;
        if (!state.brushOverrideCanvas || state.brushOverrideCanvas.width !== src.width || state.brushOverrideCanvas.height !== src.height) {
            releaseCanvas(state.brushOverrideCanvas);
            const c = document.createElement('canvas');
            c.width = src.width;
            c.height = src.height;
            state.brushOverrideCanvas = c;
        }
        return state.brushOverrideCanvas;
    }

    // Plain wall: median color of thin outer ring + border-seeded BFS flood fill + feather
    function buildPlainWallMask() {
        const src = state.orientedPreviewCanvas;
        if (!src) return;
        const maxMaskSide = 640;
        const scale = Math.min(1, maxMaskSide / Math.max(src.width, src.height));
        const mw = Math.max(16, Math.round(src.width * scale));
        const mh = Math.max(16, Math.round(src.height * scale));

        const tmp = document.createElement('canvas');
        tmp.width = mw;
        tmp.height = mh;
        const tctx = tmp.getContext('2d');
        tctx.drawImage(src, 0, 0, mw, mh);
        const imgData = tctx.getImageData(0, 0, mw, mh);
        const data = imgData.data;

        // 1) Median wall color from thin outer ring (~2% of shorter side, min 3px)
        const ring = Math.max(3, Math.min(14, Math.round(Math.min(mw, mh) * 0.025)));
        const histR = new Uint32Array(256);
        const histG = new Uint32Array(256);
        const histB = new Uint32Array(256);
        let sampleCount = 0;

        for (let y = 0; y < mh; y++) {
            const inVertRing = y < ring || y >= mh - ring;
            for (let x = 0; x < mw; x++) {
                if (!inVertRing && x >= ring && x < mw - ring) continue;
                const idx = (y * mw + x) * 4;
                histR[data[idx]]++;
                histG[data[idx + 1]]++;
                histB[data[idx + 2]]++;
                sampleCount++;
            }
        }

        const medianFromHist = (hist, total) => {
            const half = total >> 1;
            let acc = 0;
            for (let i = 0; i < 256; i++) {
                acc += hist[i];
                if (acc >= half) return i;
            }
            return 255;
        };

        const wallR = medianFromHist(histR, sampleCount);
        const wallG = medianFromHist(histG, sampleCount);
        const wallB = medianFromHist(histB, sampleCount);

        // 2) Border-only BFS flood fill using RMS RGB distance <= tolerance
        const tol = state.plainTolerance;
        const tolSq3 = tol * tol * 3; // compares (dr^2 + dg^2 + db^2) <= 3 * tol^2
        const totalPx = mw * mh;
        const bgVisited = new Uint8Array(totalPx); // 1 = background
        const queue = new Int32Array(totalPx);
        let qHead = 0;
        let qTail = 0;

        const isWallLike = (pIdx) => {
            const i4 = pIdx * 4;
            const dr = data[i4] - wallR;
            const dg = data[i4 + 1] - wallG;
            const db = data[i4 + 2] - wallB;
            return (dr * dr + dg * dg + db * db) <= tolSq3;
        };

        const trySeed = (x, y) => {
            const p = y * mw + x;
            if (bgVisited[p]) return;
            if (isWallLike(p)) {
                bgVisited[p] = 1;
                queue[qTail++] = p;
            }
        };

        for (let x = 0; x < mw; x++) {
            trySeed(x, 0);
            trySeed(x, mh - 1);
        }
        for (let y = 1; y < mh - 1; y++) {
            trySeed(0, y);
            trySeed(mw - 1, y);
        }

        while (qHead < qTail) {
            const p = queue[qHead++];
            const x = p % mw;
            const y = (p - x) / mw;
            if (x > 0) {
                const n = p - 1;
                if (!bgVisited[n] && isWallLike(n)) { bgVisited[n] = 1; queue[qTail++] = n; }
            }
            if (x + 1 < mw) {
                const n = p + 1;
                if (!bgVisited[n] && isWallLike(n)) { bgVisited[n] = 1; queue[qTail++] = n; }
            }
            if (y > 0) {
                const n = p - mw;
                if (!bgVisited[n] && isWallLike(n)) { bgVisited[n] = 1; queue[qTail++] = n; }
            }
            if (y + 1 < mh) {
                const n = p + mw;
                if (!bgVisited[n] && isWallLike(n)) { bgVisited[n] = 1; queue[qTail++] = n; }
            }
        }

        // Build alpha mask canvas (white with alpha = 255 for foreground, 0 for background)
        const maskImg = tctx.createImageData(mw, mh);
        const md = maskImg.data;
        for (let i = 0; i < totalPx; i++) {
            const i4 = i * 4;
            md[i4] = 255;
            md[i4 + 1] = 255;
            md[i4 + 2] = 255;
            md[i4 + 3] = bgVisited[i] ? 0 : 255;
        }
        tctx.putImageData(maskImg, 0, 0);

        const finalMask = applyFeatherToMask(tmp, src.width, src.height, state.plainFeather);
        releaseCanvas(tmp);
        releaseCanvas(state.baseMaskCanvas);
        state.baseMaskCanvas = finalMask;
    }

    function buildSmartMaskFromConfidence() {
        const src = state.orientedPreviewCanvas;
        const raw = state.smartRawMask;
        if (!src || !raw) return;

        const { data, width, height } = raw;
        const tmp = document.createElement('canvas');
        tmp.width = width;
        tmp.height = height;
        const tctx = tmp.getContext('2d');
        const imgData = tctx.createImageData(width, height);
        const out = imgData.data;

        // Soft transition band around threshold for cleaner hair/shoulder edges
        const thresh = state.smartThreshold;
        const softHalf = 0.08;
        const lo = Math.max(0, thresh - softHalf);
        const hi = Math.min(1, thresh + softHalf);
        const span = Math.max(0.001, hi - lo);

        for (let i = 0; i < data.length; i++) {
            const v = data[i];
            let a;
            if (v <= lo) a = 0;
            else if (v >= hi) a = 255;
            else a = Math.round(((v - lo) / span) * 255);
            const i4 = i * 4;
            out[i4] = 255;
            out[i4 + 1] = 255;
            out[i4 + 2] = 255;
            out[i4 + 3] = a;
        }
        tctx.putImageData(imgData, 0, 0);

        const finalMask = applyFeatherToMask(tmp, src.width, src.height, state.smartFeather);
        releaseCanvas(tmp);
        releaseCanvas(state.baseMaskCanvas);
        state.baseMaskCanvas = finalMask;
    }

    function applyFeatherToMask(smallMask, targetW, targetH, featherPx) {
        const out = document.createElement('canvas');
        out.width = targetW;
        out.height = targetH;
        const ctx = out.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (featherPx > 0.05 && 'filter' in ctx) {
            // Scale blur proportionally to target canvas size
            const scaledBlur = Math.max(0.5, featherPx * (Math.max(targetW, targetH) / 700));
            ctx.filter = `blur(${scaledBlur.toFixed(2)}px)`;
        }
        ctx.drawImage(smallMask, 0, 0, targetW, targetH);
        ctx.filter = 'none';
        return out;
    }

    function buildCombinedMaskCanvas(targetW, targetH) {
        if (state.bgMode === 'original' || !state.baseMaskCanvas) return null;
        const combined = document.createElement('canvas');
        combined.width = targetW;
        combined.height = targetH;
        const ctx = combined.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(state.baseMaskCanvas, 0, 0, targetW, targetH);

        if (state.brushOverrideCanvas) {
            // Brush override stores: red channel > 128 => erase, green channel > 128 => restore
            const bw = state.brushOverrideCanvas.width;
            const bh = state.brushOverrideCanvas.height;
            const bctx = state.brushOverrideCanvas.getContext('2d');
            const bData = bctx.getImageData(0, 0, bw, bh).data;

            const eraseCanvas = document.createElement('canvas');
            eraseCanvas.width = bw;
            eraseCanvas.height = bh;
            const ectx = eraseCanvas.getContext('2d');
            const eImg = ectx.createImageData(bw, bh);

            const restoreCanvas = document.createElement('canvas');
            restoreCanvas.width = bw;
            restoreCanvas.height = bh;
            const rctx = restoreCanvas.getContext('2d');
            const rImg = rctx.createImageData(bw, bh);

            let hasErase = false;
            let hasRestore = false;
            const ed = eImg.data;
            const rd = rImg.data;

            for (let i = 0; i < bData.length; i += 4) {
                const a = bData[i + 3];
                if (a === 0) continue;
                if (bData[i] > bData[i + 1]) {
                    // Erase
                    ed[i] = 255; ed[i + 1] = 255; ed[i + 2] = 255; ed[i + 3] = a;
                    hasErase = true;
                } else {
                    // Restore
                    rd[i] = 255; rd[i + 1] = 255; rd[i + 2] = 255; rd[i + 3] = a;
                    hasRestore = true;
                }
            }

            if (hasErase) {
                ectx.putImageData(eImg, 0, 0);
                ctx.globalCompositeOperation = 'destination-out';
                ctx.drawImage(eraseCanvas, 0, 0, targetW, targetH);
            }
            if (hasRestore) {
                rctx.putImageData(rImg, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(restoreCanvas, 0, 0, targetW, targetH);
            }
            ctx.globalCompositeOperation = 'source-over';
            releaseCanvas(eraseCanvas);
            releaseCanvas(restoreCanvas);
        }
        return combined;
    }

    function computeAutoLevels() {
        const src = state.orientedPreviewCanvas;
        if (!src) { state.autoLevels = null; return; }
        const tmp = downscaleCanvasIfNeeded(src, 240);
        const ctx = tmp.getContext('2d');
        const data = ctx.getImageData(0, 0, tmp.width, tmp.height).data;
        const hist = new Uint32Array(256);
        const count = tmp.width * tmp.height;
        for (let i = 0; i < data.length; i += 4) {
            const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            hist[lum]++;
        }
        releaseCanvas(tmp);

        const target1 = Math.floor(count * 0.01);
        const target99 = Math.floor(count * 0.99);
        let p1 = 0;
        let p99 = 255;
        let acc = 0;
        for (let i = 0; i < 256; i++) {
            acc += hist[i];
            if (acc >= target1) { p1 = i; break; }
        }
        acc = 0;
        for (let i = 0; i < 256; i++) {
            acc += hist[i];
            if (acc >= target99) { p99 = i; break; }
        }
        state.autoLevels = { p1, p99 };
    }

    function applyAutoLevelsToCanvas(canvas) {
        if (!state.autoEnhance || !state.autoLevels) return;
        const { p1, p99 } = state.autoLevels;
        const range = p99 - p1;
        if (range < 16 || (p1 <= 4 && p99 >= 251)) return;

        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        // Mild 60% blend toward full 1st-99th stretch so skin tones stay natural
        const strength = 0.6;
        const lut = new Uint8ClampedArray(256);
        for (let i = 0; i < 256; i++) {
            const stretched = ((i - p1) * 255) / range;
            const blended = i + (stretched - i) * strength;
            lut[i] = blended < 0 ? 0 : (blended > 255 ? 255 : Math.round(blended));
        }
        for (let i = 0; i < d.length; i += 4) {
            d[i] = lut[d[i]];
            d[i + 1] = lut[d[i + 1]];
            d[i + 2] = lut[d[i + 2]];
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function applyRetouchFilterToCanvas(sourceCanvas) {
        const out = document.createElement('canvas');
        out.width = sourceCanvas.width;
        out.height = sourceCanvas.height;
        const ctx = out.getContext('2d');
        const hasFilter = state.brightness !== 100 || state.contrast !== 100 || state.saturation !== 100;
        if (hasFilter && 'filter' in ctx) {
            ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
            ctx.drawImage(sourceCanvas, 0, 0);
            ctx.filter = 'none';
        } else {
            ctx.drawImage(sourceCanvas, 0, 0);
            if (hasFilter) {
                applyManualRetouchPixels(out);
            }
        }
        if (state.autoEnhance) {
            applyAutoLevelsToCanvas(out);
        }
        return out;
    }

    function applyManualRetouchPixels(canvas) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const b = state.brightness / 100;
        const c = state.contrast / 100;
        const s = state.saturation / 100;
        for (let i = 0; i < d.length; i += 4) {
            let r = d[i] * b;
            let g = d[i + 1] * b;
            let bl = d[i + 2] * b;
            r = (r - 128) * c + 128;
            g = (g - 128) * c + 128;
            bl = (bl - 128) * c + 128;
            const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
            d[i] = Math.max(0, Math.min(255, gray + (r - gray) * s));
            d[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * s));
            d[i + 2] = Math.max(0, Math.min(255, gray + (bl - gray) * s));
        }
        ctx.putImageData(imgData, 0, 0);
    }

    // Composites foreground + mask + background color + retouch for any source canvas
    function compositeSourceWithBgAndRetouch(orientedSrcCanvas) {
        const w = orientedSrcCanvas.width;
        const h = orientedSrcCanvas.height;

        // Apply retouch to the person photo first (so solid background swatch stays exact pure color!)
        const retouchedPerson = applyRetouchFilterToCanvas(orientedSrcCanvas);

        if (state.bgMode === 'original' || !state.baseMaskCanvas) {
            return retouchedPerson;
        }

        const maskCanvas = buildCombinedMaskCanvas(w, h);
        if (!maskCanvas) return retouchedPerson;

        // Mask the person
        const fg = document.createElement('canvas');
        fg.width = w;
        fg.height = h;
        const fctx = fg.getContext('2d');
        fctx.drawImage(retouchedPerson, 0, 0);
        fctx.globalCompositeOperation = 'destination-in';
        fctx.drawImage(maskCanvas, 0, 0);
        fctx.globalCompositeOperation = 'source-over';

        // Composite onto chosen background swatch
        const finalC = document.createElement('canvas');
        finalC.width = w;
        finalC.height = h;
        const ctx = finalC.getContext('2d');
        ctx.fillStyle = state.bgColor || '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(fg, 0, 0);

        releaseCanvas(retouchedPerson);
        releaseCanvas(maskCanvas);
        releaseCanvas(fg);
        return finalC;
    }

    function rebuildCompositedPreview() {
        if (!state.orientedPreviewCanvas) return;
        releaseCanvas(state.compositedPreviewCanvas);
        state.compositedPreviewCanvas = compositeSourceWithBgAndRetouch(state.orientedPreviewCanvas);
        state.sheetThumbDirty = true;
        scheduleViewportRender();
    }

    // =====================================================
    // STICKY INTERACTIVE CROP VIEWPORT
    // =====================================================

    function computeViewportGeometry() {
        const canvas = document.getElementById('ps-crop-canvas');
        const wrap = document.getElementById('ps-canvas-wrap');
        if (!canvas || !wrap) return;

        const rect = wrap.getBoundingClientRect();
        const cssW = Math.max(240, Math.floor(rect.width || 320));
        const size = getSelectedSizeMm();
        const aspect = size.wMm / size.hMm;

        // Compact mobile-friendly height (fits comfortably above tabs at 360px width)
        const maxH = Math.min(340, Math.max(230, Math.round(window.innerHeight * 0.40)));
        const cssH = Math.max(220, Math.min(maxH, Math.round(cssW * 0.84)));

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const pixelW = Math.round(cssW * dpr);
        const pixelH = Math.round(cssH * dpr);
        if (canvas.width !== pixelW || canvas.height !== pixelH) {
            canvas.width = pixelW;
            canvas.height = pixelH;
        }
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';

        // Fixed crop frame centered inside viewport with breathing room for dimmed outer area
        const padX = 24;
        const padY = 18;
        const availW = Math.max(80, cssW - padX * 2);
        const availH = Math.max(80, cssH - padY * 2);
        let frameW = availW;
        let frameH = frameW / aspect;
        if (frameH > availH) {
            frameH = availH;
            frameW = frameH * aspect;
        }
        const frameX = (cssW - frameW) / 2;
        const frameY = (cssH - frameH) / 2;

        state.vp.w = cssW;
        state.vp.h = cssH;
        state.vp.dpr = dpr;
        state.vp.frameX = frameX;
        state.vp.frameY = frameY;
        state.vp.frameW = frameW;
        state.vp.frameH = frameH;
    }

    function scheduleViewportRender() {
        if (state.rafPending) return;
        state.rafPending = true;
        requestAnimationFrame(() => {
            state.rafPending = false;
            renderViewport();
        });
    }

    function renderViewport() {
        if (state.step !== 2) return;
        const canvas = document.getElementById('ps-crop-canvas');
        if (!canvas) return;
        computeViewportGeometry();
        clampTransform();

        const ctx = canvas.getContext('2d');
        const { w, h, dpr, frameX, frameY, frameW, frameH } = state.vp;
        ctx.save();
        ctx.scale(dpr, dpr);

        // Background canvas surface
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#10100F' : '#252320';
        ctx.fillRect(0, 0, w, h);

        const img = state.compositedPreviewCanvas || state.orientedPreviewCanvas;
        if (img) {
            const sMin = computeMinCoverScale(img.width, img.height, frameW, frameH, state.straightenDeg);
            const scale = sMin * state.zoomRel;
            const cx = frameX + frameW / 2 + state.panX * frameW;
            const cy = frameY + frameH / 2 + state.panY * frameH;

            ctx.save();
            ctx.translate(cx, cy);
            if (state.straightenDeg !== 0) {
                ctx.rotate((state.straightenDeg * Math.PI) / 180);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(
                img,
                (-img.width * scale) / 2,
                (-img.height * scale) / 2,
                img.width * scale,
                img.height * scale
            );
            ctx.restore();
        }

        // Dimmed area outside fixed crop frame (4 rects around frame)
        ctx.fillStyle = 'rgba(18, 17, 16, 0.62)';
        ctx.fillRect(0, 0, w, frameY);
        ctx.fillRect(0, frameY + frameH, w, h - (frameY + frameH));
        ctx.fillRect(0, frameY, frameX, frameH);
        ctx.fillRect(frameX + frameW, frameY, w - (frameX + frameW), frameH);

        // Crisp crop frame border + editorial corner brackets
        ctx.strokeStyle = '#FAF8F5';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(frameX + 0.5, frameY + 0.5, frameW - 1, frameH - 1);

        const cornerLen = Math.min(16, frameW * 0.12, frameH * 0.12);
        ctx.strokeStyle = '#E06D53';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(frameX, frameY + cornerLen); ctx.lineTo(frameX, frameY); ctx.lineTo(frameX + cornerLen, frameY);
        // Top-right
        ctx.moveTo(frameX + frameW - cornerLen, frameY); ctx.lineTo(frameX + frameW, frameY); ctx.lineTo(frameX + frameW, frameY + cornerLen);
        // Bottom-left
        ctx.moveTo(frameX, frameY + frameH - cornerLen); ctx.lineTo(frameX, frameY + frameH); ctx.lineTo(frameX + cornerLen, frameY + frameH);
        // Bottom-right
        ctx.moveTo(frameX + frameW - cornerLen, frameY + frameH); ctx.lineTo(frameX + frameW, frameY + frameH); ctx.lineTo(frameX + frameW, frameY + frameH - cornerLen);
        ctx.stroke();

        // Biometric guide overlay (never exported)
        if (state.showGuides) {
            drawBiometricGuides(ctx, frameX, frameY, frameW, frameH);
        }

        ctx.restore();
        syncScaleUi();
    }

    function drawBiometricGuides(ctx, fx, fy, fw, fh) {
        const yHair = fy + fh * 0.10;
        const yEye = fy + fh * 0.40;
        const yChin = fy + fh * 0.86;

        ctx.save();
        // Clip strictly to the crop frame
        ctx.beginPath();
        ctx.rect(fx, fy, fw, fh);
        ctx.clip();

        // Dashed face oval spanning hairline (10%) to chin (86%)
        const ovalCy = (yHair + yChin) / 2;
        const ovalRy = (yChin - yHair) / 2;
        const ovalRx = Math.min(fw * 0.34, ovalRy * 0.72);

        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.beginPath();
        ctx.ellipse(fx + fw / 2, ovalCy, ovalRx, ovalRy, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Horizontal guide lines: HAIRLINE (10%), EYE LINE (40%), CHIN (86%)
        const guides = [
            { y: yHair, label: 'HAIRLINE', color: 'rgba(255, 255, 255, 0.85)' },
            { y: yEye, label: 'EYE LINE', color: 'rgba(224, 109, 83, 0.95)' },
            { y: yChin, label: 'CHIN', color: 'rgba(255, 255, 255, 0.85)' }
        ];

        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textBaseline = 'bottom';

        guides.forEach(g => {
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = g.color;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(fx + 4, g.y);
            ctx.lineTo(fx + fw - 4, g.y);
            ctx.stroke();

            // Mono pill tag
            ctx.setLineDash([]);
            const tw = ctx.measureText(g.label).width;
            const padX = 4;
            const pillH = 12;
            const pillX = fx + 6;
            const pillY = Math.max(fy + 2, g.y - pillH - 2);
            ctx.fillStyle = 'rgba(20, 20, 19, 0.72)';
            ctx.fillRect(pillX, pillY, tw + padX * 2, pillH);
            ctx.fillStyle = g.label === 'EYE LINE' ? '#F6B19F' : '#FAF8F5';
            ctx.fillText(g.label, pillX + padX, pillY + pillH - 2);
        });

        ctx.restore();
    }

    // Map viewport CSS coordinates (x, y) to orientedPreviewCanvas image coordinates (ix, iy)
    function viewportToImageCoords(cssX, cssY) {
        const img = state.orientedPreviewCanvas;
        if (!img) return null;
        const { frameX, frameY, frameW, frameH } = state.vp;
        const sMin = computeMinCoverScale(img.width, img.height, frameW, frameH, state.straightenDeg);
        const scale = sMin * state.zoomRel;
        const cx = frameX + frameW / 2 + state.panX * frameW;
        const cy = frameY + frameH / 2 + state.panY * frameH;
        const dx = cssX - cx;
        const dy = cssY - cy;
        const rad = (-state.straightenDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        return {
            x: rx / scale + img.width / 2,
            y: ry / scale + img.height / 2,
            scale
        };
    }

    // =====================================================
    // POINTER EVENTS (PAN, PINCH ZOOM, WHEEL, BRUSH)
    // =====================================================

    function bindCanvasEvents() {
        const canvas = document.getElementById('ps-crop-canvas');
        if (!canvas || canvas.dataset.psBound === '1') return;
        canvas.dataset.psBound = '1';

        const getLocal = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        // Block touch page scrolling while finger is on the crop canvas
        canvas.addEventListener('touchstart', (e) => {
            if (e.cancelable) e.preventDefault();
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('pointerdown', (e) => {
            if (!state.orientedPreviewCanvas) return;
            if (e.cancelable) e.preventDefault();
            try { canvas.setPointerCapture(e.pointerId); } catch (_) {}

            const pt = getLocal(e);
            state.vp.pointers.set(e.pointerId, pt);

            if (state.vp.pointers.size === 1) {
                if (state.brushActive && state.bgMode !== 'original') {
                    state.vp.isBrushing = true;
                    state.vp.isPanning = false;
                    pushBrushUndoSnapshot();
                    const imgPt = viewportToImageCoords(pt.x, pt.y);
                    if (imgPt) {
                        state.vp.lastBrushX = imgPt.x;
                        state.vp.lastBrushY = imgPt.y;
                        paintBrushStroke(imgPt.x, imgPt.y, imgPt.x, imgPt.y, imgPt.scale);
                    }
                } else {
                    state.vp.isPanning = true;
                    state.vp.isBrushing = false;
                    state.vp.lastPanX = pt.x;
                    state.vp.lastPanY = pt.y;
                }
            } else if (state.vp.pointers.size === 2) {
                // Switch to 2-finger pinch zoom (even when brush is active)
                state.vp.isBrushing = false;
                state.vp.isPanning = false;
                const pts = Array.from(state.vp.pointers.values());
                state.vp.pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
                state.vp.pinchStartZoom = state.zoomRel;
                state.vp.pinchMidX = (pts[0].x + pts[1].x) / 2;
                state.vp.pinchMidY = (pts[0].y + pts[1].y) / 2;
            }
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!state.vp.pointers.has(e.pointerId)) return;
            if (e.cancelable) e.preventDefault();
            const pt = getLocal(e);
            state.vp.pointers.set(e.pointerId, pt);

            if (state.vp.pointers.size === 2) {
                const pts = Array.from(state.vp.pointers.values());
                const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
                const midX = (pts[0].x + pts[1].x) / 2;
                const midY = (pts[0].y + pts[1].y) / 2;
                const ratio = dist / Math.max(1, state.vp.pinchStartDist);
                const prevZoom = state.zoomRel;
                const nextZoom = Math.max(1.0, Math.min(5.0, state.vp.pinchStartZoom * ratio));

                // Keep midpoint anchored during pinch
                const zoomFactor = nextZoom / Math.max(0.001, prevZoom);
                const dMidX = midX - state.vp.pinchMidX;
                const dMidY = midY - state.vp.pinchMidY;
                const fCx = state.vp.frameX + state.vp.frameW / 2;
                const fCy = state.vp.frameY + state.vp.frameH / 2;
                const relX = midX - fCx;
                const relY = midY - fCy;

                state.panX = (state.panX * state.vp.frameW * zoomFactor + relX * (1 - zoomFactor) + dMidX) / state.vp.frameW;
                state.panY = (state.panY * state.vp.frameH * zoomFactor + relY * (1 - zoomFactor) + dMidY) / state.vp.frameH;
                state.zoomRel = nextZoom;
                state.vp.pinchMidX = midX;
                state.vp.pinchMidY = midY;
                state.sheetThumbDirty = true;
                scheduleViewportRender();
            } else if (state.vp.pointers.size === 1) {
                if (state.vp.isBrushing) {
                    const imgPt = viewportToImageCoords(pt.x, pt.y);
                    if (imgPt) {
                        paintBrushStroke(state.vp.lastBrushX, state.vp.lastBrushY, imgPt.x, imgPt.y, imgPt.scale);
                        state.vp.lastBrushX = imgPt.x;
                        state.vp.lastBrushY = imgPt.y;
                    }
                } else if (state.vp.isPanning) {
                    const dx = pt.x - state.vp.lastPanX;
                    const dy = pt.y - state.vp.lastPanY;
                    state.vp.lastPanX = pt.x;
                    state.vp.lastPanY = pt.y;
                    state.panX += dx / Math.max(1, state.vp.frameW);
                    state.panY += dy / Math.max(1, state.vp.frameH);
                    state.sheetThumbDirty = true;
                    scheduleViewportRender();
                }
            }
        });

        const endPointer = (e) => {
            state.vp.pointers.delete(e.pointerId);
            if (state.vp.pointers.size === 0) {
                state.vp.isPanning = false;
                state.vp.isBrushing = false;
            } else if (state.vp.pointers.size === 1) {
                const remaining = Array.from(state.vp.pointers.values())[0];
                state.vp.isPanning = !(state.brushActive && state.bgMode !== 'original');
                state.vp.isBrushing = false;
                state.vp.lastPanX = remaining.x;
                state.vp.lastPanY = remaining.y;
            }
        };

        canvas.addEventListener('pointerup', endPointer);
        canvas.addEventListener('pointercancel', endPointer);

        // Mouse wheel zoom on desktop
        canvas.addEventListener('wheel', (e) => {
            if (!state.orientedPreviewCanvas) return;
            e.preventDefault();
            const delta = -Math.sign(e.deltaY) * 0.12;
            setZoomRelative(state.zoomRel * (1 + delta));
        }, { passive: false });
    }

    function pushBrushUndoSnapshot() {
        const bc = ensureBrushCanvas();
        if (!bc) return;
        const ctx = bc.getContext('2d');
        state.brushUndoStack.push(ctx.getImageData(0, 0, bc.width, bc.height));
        if (state.brushUndoStack.length > 15) {
            state.brushUndoStack.shift();
        }
        updateBrushUndoBtn();
    }

    function paintBrushStroke(x1, y1, x2, y2, scale) {
        const bc = ensureBrushCanvas();
        if (!bc) return;
        const radiusScreen = state.brushSize === 'S' ? 10 : state.brushSize === 'L' ? 28 : 18;
        const radiusImg = Math.max(3, radiusScreen / Math.max(0.05, scale));

        const ctx = bc.getContext('2d');
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = radiusImg * 2;
        // Erase => red, Restore => green
        ctx.strokeStyle = state.brushMode === 'erase' ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 255, 0, 1)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();

        rebuildCompositedPreview();
    }

    function undoBrushStroke() {
        const bc = state.brushOverrideCanvas;
        if (!bc || state.brushUndoStack.length === 0) return;
        const snap = state.brushUndoStack.pop();
        bc.getContext('2d').putImageData(snap, 0, 0);
        updateBrushUndoBtn();
        rebuildCompositedPreview();
        haptic('click');
    }

    function updateBrushUndoBtn() {
        const btn = document.getElementById('ps-brush-undo');
        if (btn) btn.disabled = state.brushUndoStack.length === 0;
    }

    // =====================================================
    // AUTO FIT FACE & SMART CUT-OUT (MEDIAPIPE)
    // =====================================================

    async function runAutoFitFace() {
        if (!state.orientedPreviewCanvas) return;
        const btn = document.getElementById('ps-autofit-btn');
        const noteEl = document.getElementById('ps-autofit-note');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Loading face detector...';
        }
        setBannerText(noteEl, 'Loading on-device face detector...', 'info');

        try {
            const detector = await getFaceDetector();
            setBannerText(noteEl, 'Detecting face...', 'info');
            await yieldMain();

            const src = state.orientedPreviewCanvas;
            const res = detector.detect(src);
            const detections = res && res.detections ? res.detections : [];
            if (detections.length === 0) {
                setBannerText(noteEl, 'No face detected — drag and pinch to fit manually.', 'warn');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Auto fit face';
                }
                return;
            }

            // Pick largest detection
            const best = detections.slice().sort((a, b) => {
                const aa = (a.boundingBox?.width || 0) * (a.boundingBox?.height || 0);
                const bb = (b.boundingBox?.width || 0) * (b.boundingBox?.height || 0);
                return bb - aa;
            })[0];

            const bb = best.boundingBox;
            const kps = best.keypoints || [];
            let eyeX = bb.originX + bb.width / 2;
            let eyeY = bb.originY + bb.height * 0.36;
            if (kps.length >= 2 && kps[0] && kps[1]) {
                eyeX = ((kps[0].x + kps[1].x) / 2) * src.width;
                eyeY = ((kps[0].y + kps[1].y) / 2) * src.height;
            }

            // Estimate full crown-to-chin head height (~1.42x BlazeFace box height)
            const headH = Math.max(20, bb.height * 1.42);
            const size = getSelectedSizeMm();
            const fW = size.wMm / size.hMm;
            const fH = 1.0;

            state.straightenDeg = 0;
            const sMin = computeMinCoverScale(src.width, src.height, fW, fH, 0);
            // Target: head height = 76% of frame height
            const desiredScale = (0.76 * fH) / headH;
            state.zoomRel = Math.max(1.0, Math.min(5.0, desiredScale / sMin));

            const finalScale = sMin * state.zoomRel;
            // Position eye center at horizontal center (0.50) and eye line (0.40 from top = -0.10 from center)
            const imgOffsetX = eyeX - src.width / 2;
            const imgOffsetY = eyeY - src.height / 2;
            state.panX = (-imgOffsetX * finalScale) / fW;
            state.panY = (-0.10 * fH - imgOffsetY * finalScale) / fH;

            clampTransform();
            syncTransformControls();
            state.sheetThumbDirty = true;
            scheduleViewportRender();

            setBannerText(noteEl, 'Face fitted to biometric guides.', 'ok');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Auto fit face';
            }
            haptic('success');
        } catch (err) {
            console.warn('Auto fit face failed:', err);
            mp.faceFailed = true;
            if (btn) btn.style.display = 'none';
            setBannerText(noteEl, 'Auto fit face needs internet once to load the detector. Drag & pinch to fit manually.', 'warn');
        }
    }

    async function runSmartCutout(showErrors) {
        const src = state.orientedPreviewCanvas;
        if (!src) return;
        const msgEl = document.getElementById('ps-bg-status');

        // Reuse cached raw confidence mask if orientation hasn't changed
        if (state.smartRawMask && state.smartRawMask.rot90 === state.rot90 && state.smartRawMask.flipH === state.flipH) {
            buildSmartMaskFromConfidence();
            rebuildCompositedPreview();
            setBannerText(msgEl, 'Smart cut-out active (on-device).', 'ok');
            return;
        }

        setBannerText(msgEl, 'Loading Smart cut-out model on device (cached for offline use)...', 'info');
        await yieldMain();

        try {
            const segmenter = await getImageSegmenter();
            setBannerText(msgEl, 'Separating subject from background...', 'info');
            await yieldMain();

            const segInput = downscaleCanvasIfNeeded(src, 512);
            const result = segmenter.segment(segInput);
            const masks = result && result.confidenceMasks ? result.confidenceMasks : [];
            if (!masks.length) {
                releaseCanvas(segInput);
                if (result && typeof result.close === 'function') result.close();
                throw new Error('Empty segmentation mask.');
            }

            let chosenMask = masks.length > 1 ? masks[1] : masks[0];
            const rawFloat = new Float32Array(chosenMask.getAsFloat32Array());
            const mw = chosenMask.width;
            const mh = chosenMask.height;

            // Sanity check polarity: corners should have lower foreground confidence than center
            const cornerAvg = (
                rawFloat[0] +
                rawFloat[mw - 1] +
                rawFloat[(mh - 1) * mw] +
                rawFloat[mh * mw - 1]
            ) / 4;
            const centerVal = rawFloat[Math.floor(mh / 2) * mw + Math.floor(mw / 2)];
            if (cornerAvg > 0.75 && centerVal < 0.35) {
                for (let i = 0; i < rawFloat.length; i++) {
                    rawFloat[i] = 1 - rawFloat[i];
                }
            }

            if (result && typeof result.close === 'function') result.close();
            releaseCanvas(segInput);

            state.smartRawMask = {
                data: rawFloat,
                width: mw,
                height: mh,
                rot90: state.rot90,
                flipH: state.flipH
            };

            buildSmartMaskFromConfidence();
            rebuildCompositedPreview();
            setBannerText(msgEl, 'Smart cut-out ready. Use Edge sliders or Fix edges brush to refine.', 'ok');
            haptic('success');
        } catch (err) {
            console.warn('Smart cut-out failed:', err);
            if (showErrors !== false) {
                setBannerText(
                    msgEl,
                    'Smart cut-out needs internet once to download a small model. Try again, or use Plain wall.',
                    'error'
                );
            }
        }
    }

    // =====================================================
    // HIGH-RES FINAL RENDERER (USES ORIGINAL IMAGE!)
    // =====================================================

    function renderCroppedPhotoCanvas(outW, outH, usePreviewFast) {
        const baseSrc = usePreviewFast ? state.previewCanvas : (state.originalCanvas || state.workingCanvas || state.previewCanvas);
        if (!baseSrc) return null;

        let oriented = usePreviewFast ? state.orientedPreviewCanvas : buildOrientedCanvas(baseSrc, state.rot90, state.flipH);
        let composited = usePreviewFast ? state.compositedPreviewCanvas : compositeSourceWithBgAndRetouch(oriented);

        const out = document.createElement('canvas');
        out.width = outW;
        out.height = outH;
        const ctx = out.getContext('2d');

        // Fill safety background
        ctx.fillStyle = state.bgMode === 'original' ? '#FFFFFF' : (state.bgColor || '#FFFFFF');
        ctx.fillRect(0, 0, outW, outH);

        const sMin = computeMinCoverScale(composited.width, composited.height, outW, outH, state.straightenDeg);
        const scale = sMin * state.zoomRel;
        const cx = outW / 2 + state.panX * outW;
        const cy = outH / 2 + state.panY * outH;

        ctx.save();
        ctx.translate(cx, cy);
        if (state.straightenDeg !== 0) {
            ctx.rotate((state.straightenDeg * Math.PI) / 180);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            composited,
            (-composited.width * scale) / 2,
            (-composited.height * scale) / 2,
            composited.width * scale,
            composited.height * scale
        );
        ctx.restore();

        if (!usePreviewFast) {
            releaseCanvas(oriented);
            releaseCanvas(composited);
        }
        return out;
    }

    function canvasToBlobAsync(canvas, mime, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Failed to encode image.')),
                mime,
                quality
            );
        });
    }

    async function encodeJpegWithDpi(canvas, quality, dpi) {
        const rawBlob = await canvasToBlobAsync(canvas, 'image/jpeg', quality);
        const buf = await rawBlob.arrayBuffer();
        const stamped = setJpegDpi(new Uint8Array(buf), dpi);
        return new Blob([stamped], { type: 'image/jpeg' });
    }

    // =====================================================
    // EXPORT: SINGLE PHOTO (WITH TARGET KB & JFIF DPI)
    // =====================================================

    async function buildSingleExportArtifact() {
        const size = getSelectedSizeMm();
        const px = calcOutputPixels(size.wMm, size.hMm, state.dpi);
        const isJpg = state.singleFormat === 'image/jpeg';

        let photoCanvas = renderCroppedPhotoCanvas(px.w, px.h, false);
        if (!photoCanvas) throw new Error('No photo loaded.');

        let finalBlob = null;
        let finalW = px.w;
        let finalH = px.h;
        let warningMsg = '';

        try {
            if (!isJpg) {
                finalBlob = await canvasToBlobAsync(photoCanvas, 'image/png');
            } else if (!state.targetKbEnabled) {
                finalBlob = await encodeJpegWithDpi(photoCanvas, 0.94, state.dpi);
            } else {
                const targetKB = parseFloat(state.targetKb);
                if (!Number.isFinite(targetKB) || targetKB < 5 || targetKB > 5000) {
                    throw new Error('Target file size must be between 5 and 5000 KB.');
                }
                const targetBytes = Math.round(targetKB * 1024);

                let workCanvas = photoCanvas;
                let curW = px.w;
                let curH = px.h;

                for (let attempt = 0; attempt < 14; attempt++) {
                    await yieldMain();
                    if (attempt > 0) {
                        const nextW = Math.max(32, Math.round(curW * 0.9));
                        const nextH = Math.max(32, Math.round(curH * 0.9));
                        if (nextW === curW && nextH === curH) break;
                        curW = nextW;
                        curH = nextH;
                        const resized = document.createElement('canvas');
                        resized.width = curW;
                        resized.height = curH;
                        const rctx = resized.getContext('2d');
                        rctx.fillStyle = '#FFFFFF';
                        rctx.fillRect(0, 0, curW, curH);
                        rctx.imageSmoothingEnabled = true;
                        rctx.imageSmoothingQuality = 'high';
                        rctx.drawImage(photoCanvas, 0, 0, curW, curH);
                        if (workCanvas !== photoCanvas) releaseCanvas(workCanvas);
                        workCanvas = resized;
                    }

                    const highBlob = await encodeJpegWithDpi(workCanvas, 0.95, state.dpi);
                    if (highBlob.size <= targetBytes) {
                        finalBlob = highBlob;
                        finalW = curW;
                        finalH = curH;
                        break;
                    }

                    const lowBlob = await encodeJpegWithDpi(workCanvas, 0.12, state.dpi);
                    if (lowBlob.size <= targetBytes) {
                        let lo = 0.12;
                        let hi = 0.95;
                        let best = lowBlob;
                        for (let step = 0; step < 7; step++) {
                            await yieldMain();
                            const mid = (lo + hi) / 2;
                            const midBlob = await encodeJpegWithDpi(workCanvas, mid, state.dpi);
                            if (midBlob.size <= targetBytes) {
                                best = midBlob;
                                lo = mid;
                            } else {
                                hi = mid;
                            }
                        }
                        finalBlob = best;
                        finalW = curW;
                        finalH = curH;
                        break;
                    }
                }

                if (workCanvas !== photoCanvas) releaseCanvas(workCanvas);
                if (!finalBlob) {
                    throw new Error(`Could not fit photo under ${targetKB} KB. Try a slightly larger target.`);
                }
                if (finalW !== px.w || finalH !== px.h) {
                    warningMsg = `Resized down to ${finalW} × ${finalH} px to fit ${targetKB} KB.`;
                }
            }
        } finally {
            releaseCanvas(photoCanvas);
        }

        const ext = isJpg ? 'jpg' : 'png';
        const kbSuffix = isJpg && state.targetKbEnabled ? `-${Math.round(state.targetKb)}KB` : '';
        const baseName = sanitizeBaseName(state.fileName);
        const filename = `${baseName}-passport-${finalW}x${finalH}-${state.dpi}dpi${kbSuffix}.${ext}`;
        const kbStr = (finalBlob.size / 1024).toFixed(1) + ' KB';

        state.lastSingleInfo = `${finalW} × ${finalH} px · ${kbStr} · ${state.dpi} DPI`;
        state.lastSingleWarning = warningMsg;
        updateSingleExportSummary();

        return { blob: finalBlob, filename, mime: state.singleFormat, finalW, finalH, warningMsg, kbStr };
    }

    async function handleSingleExport(mode) {
        const statusEl = document.getElementById('ps-single-status');
        try {
            showBusy('Exporting passport photo...');
            setBannerText(statusEl, 'Rendering full-resolution photo...', 'info');
            await yieldMain();

            const art = await buildSingleExportArtifact();
            hideBusy();

            if (mode === 'share') {
                const shared = await tryShareOrFallback(art.blob, art.filename, art.mime, 'Passport Photo');
                setBannerText(
                    statusEl,
                    shared ? `Shared ${art.filename} (${art.kbStr}).` : `Saved ${art.filename} (${art.kbStr}).`,
                    'ok'
                );
            } else {
                triggerDownload(art.blob, art.filename, art.mime);
                setBannerText(statusEl, `Ready: ${art.finalW} × ${art.finalH} px (${art.kbStr}).`, 'ok');
            }
            playStudioSound('success');
        } catch (err) {
            hideBusy();
            setBannerText(statusEl, err && err.message ? err.message : 'Export failed. Please try again.', 'error');
            playStudioSound('error');
        }
    }

    // =====================================================
    // EXPORT: PRINT SHEET (LIVE PREVIEW, PDF, PNG/JPG)
    // =====================================================

    function getCaptionText() {
        const name = (state.sheet.captionName || '').trim();
        let dateStr = '';
        if (state.sheet.captionDate) {
            const d = new Date();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            dateStr = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }
        if (name && dateStr) return `${name} · ${dateStr}`;
        return name || dateStr;
    }

    function getCurrentSheetLayout() {
        const size = getSelectedSizeMm();
        return calcSheetLayout({
            paper: state.sheet.paper,
            orientation: state.sheet.orientation,
            photoWMm: size.wMm,
            photoHMm: size.hMm,
            marginMm: state.sheet.marginMm,
            gapMm: state.sheet.gapMm,
            countMode: state.sheet.countMode,
            customCount: state.sheet.customCount,
            hasCaption: Boolean(getCaptionText())
        });
    }

    function ensureSheetPreviewThumb() {
        if (!state.sheetThumbDirty && state.sheetThumbCanvas) return state.sheetThumbCanvas;
        const size = getSelectedSizeMm();
        const aspect = size.wMm / size.hMm;
        const th = 220;
        const tw = Math.max(40, Math.round(th * aspect));
        releaseCanvas(state.sheetThumbCanvas);
        state.sheetThumbCanvas = renderCroppedPhotoCanvas(tw, th, true);
        state.sheetThumbDirty = false;
        return state.sheetThumbCanvas;
    }

    function renderPrintSheetPreview() {
        if (state.step !== 3 || state.exportTab !== 'sheet') return;
        const canvas = document.getElementById('ps-sheet-preview');
        const chipEl = document.getElementById('ps-sheet-chip');
        if (!canvas) return;

        const size = getSelectedSizeMm();
        const layout = getCurrentSheetLayout();
        if (chipEl) {
            const photoWord = layout.count === 1 ? 'photo' : 'photos';
            chipEl.textContent = `${layout.paperName} ${layout.orientation} · ${layout.count} ${photoWord} · ${size.labelDims}`;
        }

        const warnEl = document.getElementById('ps-sheet-status');
        if (layout.maxCount === 0) {
            setBannerText(warnEl, 'Photo size + margin does not fit on this paper. Reduce margin or choose larger paper.', 'warn');
        } else if (warnEl && warnEl.dataset.kind === 'warn') {
            setBannerText(warnEl, '', '');
        }

        // Render preview scaled neatly to container width
        const wrap = document.getElementById('ps-sheet-preview-wrap');
        const wrapW = Math.max(220, (wrap ? wrap.clientWidth : 300) - 16);
        const baseScale = Math.min(wrapW / layout.paperWMm, 340 / layout.paperHMm);
        const cssW = Math.max(120, Math.round(layout.paperWMm * baseScale * state.sheet.previewZoom));
        const cssH = Math.max(120, Math.round(layout.paperHMm * baseScale * state.sheet.previewZoom));
        const dpr = Math.min(2, window.devicePixelRatio || 1);

        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';

        const thumb = ensureSheetPreviewThumb();
        const pxPerMm = (cssW * dpr) / layout.paperWMm;
        drawSheetOntoCanvas(canvas, thumb, layout, pxPerMm, getCaptionText(), state.sheet.border);

        const zoomLabel = document.getElementById('ps-sheet-zoom-val');
        if (zoomLabel) zoomLabel.textContent = `${Math.round(state.sheet.previewZoom * 100)}%`;
    }

    function drawSheetOntoCanvas(sheetCanvas, photoTileCanvas, layout, pxPerMm, captionText, borderStyle) {
        const ctx = sheetCanvas.getContext('2d');
        const sw = sheetCanvas.width;
        const sh = sheetCanvas.height;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, sw, sh);

        if (!photoTileCanvas || layout.count <= 0 || layout.cols <= 0 || layout.rows <= 0) return;

        const gridWMm = layout.cols * layout.cellW + (layout.cols - 1) * layout.gap;
        const actualRows = Math.ceil(layout.count / layout.cols);
        const gridHMm = actualRows * layout.cellH + (actualRows - 1) * layout.gap;
        const startXMm = Math.max(layout.margin, (layout.paperWMm - gridWMm) / 2);
        const startYMm = Math.max(layout.margin, (layout.paperHMm - gridHMm) / 2);

        const photoPxW = layout.photoW * pxPerMm;
        const photoPxH = layout.photoH * pxPerMm;
        const captionPxH = layout.captionH * pxPerMm;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const cutLen = Math.max(3, 2.2 * pxPerMm);
        const thinLineW = Math.max(0.75, 0.25 * pxPerMm);

        let drawn = 0;
        for (let r = 0; r < actualRows && drawn < layout.count; r++) {
            for (let c = 0; c < layout.cols && drawn < layout.count; c++) {
                const xMm = startXMm + c * (layout.cellW + layout.gap);
                const yMm = startYMm + r * (layout.cellH + layout.gap);
                const x = Math.round(xMm * pxPerMm);
                const y = Math.round(yMm * pxPerMm);
                const pw = Math.round(photoPxW);
                const ph = Math.round(photoPxH);

                ctx.drawImage(photoTileCanvas, x, y, pw, ph);

                if (borderStyle === 'thin') {
                    ctx.strokeStyle = '#9CA3AF';
                    ctx.lineWidth = thinLineW;
                    ctx.strokeRect(x + thinLineW / 2, y + thinLineW / 2, pw - thinLineW, ph - thinLineW);
                } else if (borderStyle === 'cutmarks') {
                    ctx.strokeStyle = '#374151';
                    ctx.lineWidth = Math.max(1, 0.22 * pxPerMm);
                    const cellBottom = y + ph + Math.round(captionPxH);
                    ctx.beginPath();
                    // Top-left
                    ctx.moveTo(x - cutLen, y); ctx.lineTo(x + cutLen * 0.5, y);
                    ctx.moveTo(x, y - cutLen); ctx.lineTo(x, y + cutLen * 0.5);
                    // Top-right
                    ctx.moveTo(x + pw + cutLen, y); ctx.lineTo(x + pw - cutLen * 0.5, y);
                    ctx.moveTo(x + pw, y - cutLen); ctx.lineTo(x + pw, y + cutLen * 0.5);
                    // Bottom-left
                    ctx.moveTo(x - cutLen, cellBottom); ctx.lineTo(x + cutLen * 0.5, cellBottom);
                    ctx.moveTo(x, cellBottom + cutLen); ctx.lineTo(x, cellBottom - cutLen * 0.5);
                    // Bottom-right
                    ctx.moveTo(x + pw + cutLen, cellBottom); ctx.lineTo(x + pw - cutLen * 0.5, cellBottom);
                    ctx.moveTo(x + pw, cellBottom + cutLen); ctx.lineTo(x + pw, cellBottom - cutLen * 0.5);
                    ctx.stroke();
                }

                if (captionText && captionPxH > 2) {
                    const fontSize = Math.max(6, Math.round(2.8 * pxPerMm));
                    ctx.fillStyle = '#171614';
                    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(captionText, x + pw / 2, y + ph + captionPxH * 0.55, pw - 2);
                }

                drawn++;
            }
        }
    }

    async function buildPrintSheetImageArtifact(mime) {
        const layout = getCurrentSheetLayout();
        if (layout.count <= 0) throw new Error('No photos fit with the current margin and paper size.');

        const sheetDpi = 300;
        const sheetW = mmToPx(layout.paperWMm, sheetDpi);
        const sheetH = mmToPx(layout.paperHMm, sheetDpi);
        const tileW = mmToPx(layout.photoW, state.dpi);
        const tileH = mmToPx(layout.photoH, state.dpi);

        // Render single processed photo once at its final pixel size, then tile with drawImage
        const singleTile = renderCroppedPhotoCanvas(tileW, tileH, false);
        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = sheetW;
        sheetCanvas.height = sheetH;

        let blob;
        try {
            const pxPerMm = sheetDpi / 25.4;
            drawSheetOntoCanvas(sheetCanvas, singleTile, layout, pxPerMm, getCaptionText(), state.sheet.border);
            await yieldMain();
            if (mime === 'image/jpeg') {
                blob = await encodeJpegWithDpi(sheetCanvas, 0.94, sheetDpi);
            } else {
                blob = await canvasToBlobAsync(sheetCanvas, 'image/png');
            }
        } finally {
            releaseCanvas(singleTile);
            releaseCanvas(sheetCanvas);
        }

        const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
        const baseName = sanitizeBaseName(state.fileName);
        const filename = `${baseName}-${layout.paperId}-${layout.count}x-300dpi.${ext}`;
        return { blob, filename, mime, layout };
    }

    async function buildPrintSheetPdfArtifact() {
        if (typeof PDFLib === 'undefined') {
            throw new Error('PDF library is unavailable. Try PNG or JPG export instead.');
        }
        const layout = getCurrentSheetLayout();
        if (layout.count <= 0) throw new Error('No photos fit with the current margin and paper size.');

        const tileW = mmToPx(layout.photoW, state.dpi);
        const tileH = mmToPx(layout.photoH, state.dpi);
        const singleTile = renderCroppedPhotoCanvas(tileW, tileH, false);

        let jpgBytes;
        try {
            const jpgBlob = await encodeJpegWithDpi(singleTile, 0.94, state.dpi);
            jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
        } finally {
            releaseCanvas(singleTile);
        }

        const pdfDoc = await PDFLib.PDFDocument.create();
        const pageW = mmToPt(layout.paperWMm);
        const pageH = mmToPt(layout.paperHMm);
        const page = pdfDoc.addPage([pageW, pageH]);
        const embeddedImg = await pdfDoc.embedJpg(jpgBytes);

        const captionText = getCaptionText();
        const font = captionText ? await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica) : null;

        const gridWMm = layout.cols * layout.cellW + (layout.cols - 1) * layout.gap;
        const actualRows = Math.ceil(layout.count / layout.cols);
        const gridHMm = actualRows * layout.cellH + (actualRows - 1) * layout.gap;
        const startXMm = Math.max(layout.margin, (layout.paperWMm - gridWMm) / 2);
        const startYMm = Math.max(layout.margin, (layout.paperHMm - gridHMm) / 2);

        const pwPt = mmToPt(layout.photoW);
        const phPt = mmToPt(layout.photoH);
        const capPt = mmToPt(layout.captionH);
        const cutPt = mmToPt(2.2);

        let drawn = 0;
        for (let r = 0; r < actualRows && drawn < layout.count; r++) {
            for (let c = 0; c < layout.cols && drawn < layout.count; c++) {
                const xMm = startXMm + c * (layout.cellW + layout.gap);
                const yMmTop = startYMm + r * (layout.cellH + layout.gap);
                const xPt = mmToPt(xMm);
                const photoBottomY = pageH - mmToPt(yMmTop + layout.photoH);
                const cellBottomY = photoBottomY - capPt;
                const photoTopY = photoBottomY + phPt;

                page.drawImage(embeddedImg, {
                    x: xPt,
                    y: photoBottomY,
                    width: pwPt,
                    height: phPt
                });

                if (state.sheet.border === 'thin') {
                    page.drawRectangle({
                        x: xPt,
                        y: photoBottomY,
                        width: pwPt,
                        height: phPt,
                        borderColor: PDFLib.rgb(0.62, 0.64, 0.68),
                        borderWidth: 0.6
                    });
                } else if (state.sheet.border === 'cutmarks') {
                    const col = PDFLib.rgb(0.22, 0.24, 0.28);
                    const opts = { thickness: 0.6, color: col };
                    const corners = [
                        { x: xPt, y: photoTopY, dx: -1, dy: 1 },
                        { x: xPt + pwPt, y: photoTopY, dx: 1, dy: 1 },
                        { x: xPt, y: cellBottomY, dx: -1, dy: -1 },
                        { x: xPt + pwPt, y: cellBottomY, dx: 1, dy: -1 }
                    ];
                    corners.forEach(pt => {
                        page.drawLine({ start: { x: pt.x + pt.dx * cutPt, y: pt.y }, end: { x: pt.x - pt.dx * cutPt * 0.4, y: pt.y }, ...opts });
                        page.drawLine({ start: { x: pt.x, y: pt.y + pt.dy * cutPt }, end: { x: pt.x, y: pt.y - pt.dy * cutPt * 0.4 }, ...opts });
                    });
                }

                if (captionText && font) {
                    const fSize = 7.5;
                    // Keep text safe for WinAnsi PDF standard font
                    const safeCap = captionText.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
                    let textWidth = font.widthOfTextAtSize(safeCap, fSize);
                    const drawSize = textWidth > pwPt - 4 ? Math.max(5.5, fSize * ((pwPt - 4) / textWidth)) : fSize;
                    textWidth = font.widthOfTextAtSize(safeCap, drawSize);
                    page.drawText(safeCap, {
                        x: xPt + (pwPt - textWidth) / 2,
                        y: cellBottomY + (capPt - drawSize) / 2,
                        size: drawSize,
                        font,
                        color: PDFLib.rgb(0.09, 0.09, 0.08)
                    });
                }
                drawn++;
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const baseName = sanitizeBaseName(state.fileName);
        const filename = `${baseName}-${layout.paperId}-${layout.count}x-print-sheet.pdf`;
        return { blob, filename, mime: 'application/pdf', layout };
    }

    async function handleSheetExport(format, mode) {
        const statusEl = document.getElementById('ps-sheet-status');
        const startTime = performance.now();
        try {
            showBusy(format === 'pdf' ? 'Building exact-scale PDF sheet...' : 'Tiling 300 DPI print sheet...');
            setBannerText(statusEl, 'Generating print sheet...', 'info');
            await yieldMain();

            let art;
            if (format === 'pdf') {
                art = await buildPrintSheetPdfArtifact();
            } else if (format === 'png') {
                art = await buildPrintSheetImageArtifact('image/png');
            } else {
                art = await buildPrintSheetImageArtifact('image/jpeg');
            }
            hideBusy();

            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            const kb = (art.blob.size / 1024).toFixed(0) + ' KB';

            if (mode === 'share') {
                const shared = await tryShareOrFallback(art.blob, art.filename, art.mime, 'Passport Print Sheet');
                setBannerText(
                    statusEl,
                    shared ? `Shared ${art.filename} (${kb}).` : `Saved ${art.filename} (${kb} · ${elapsed}s).`,
                    'ok'
                );
            } else {
                triggerDownload(art.blob, art.filename, art.mime);
                setBannerText(
                    statusEl,
                    `Ready: ${art.layout.paperName} ${art.layout.orientation} (${art.layout.count} photos · ${kb} · ${elapsed}s).`,
                    'ok'
                );
            }
            playStudioSound('success');
        } catch (err) {
            hideBusy();
            setBannerText(statusEl, err && err.message ? err.message : 'Print sheet export failed.', 'error');
            playStudioSound('error');
        }
    }

    // =====================================================
    // DOWNLOAD & WEB SHARE HELPERS (WEB-ONLY + FALLBACK)
    // =====================================================

    function triggerDownload(blob, filename, mime) {
        if (typeof global.downloadFile === 'function') {
            global.downloadFile(blob, filename, mime);
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    async function tryShareOrFallback(blob, filename, mime, title) {
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof File !== 'undefined') {
                const file = new File([blob], filename, { type: mime });
                if (!navigator.canShare || navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: title || '1010 Tools' });
                    return true;
                }
            }
        } catch (err) {
            // User canceled share dialog -> do not also force download
            if (err && err.name === 'AbortError') return true;
        }
        triggerDownload(blob, filename, mime);
        return false;
    }

    // =====================================================
    // FILE UPLOAD & STEPPER NAVIGATION
    // =====================================================

    async function handleFileSelect(file) {
        if (!file) return;
        const uploadStatus = document.getElementById('ps-upload-status');
        try {
            showBusy('Reading photo...');
            setBannerText(uploadStatus, 'Loading photo locally...', 'info');
            await yieldMain();

            const decoded = await decodeImageRespectingExif(file);
            releaseCanvas(state.originalCanvas);
            releaseCanvas(state.workingCanvas);
            releaseCanvas(state.previewCanvas);

            state.fileName = (file.name || 'passport-photo').replace(/\.[^/.]+$/, '') || 'passport-photo';
            state.originalCanvas = decoded;
            state.workingCanvas = Math.max(decoded.width, decoded.height) > 4000
                ? downscaleCanvasIfNeeded(decoded, 4000)
                : decoded;
            state.previewCanvas = downscaleCanvasIfNeeded(state.workingCanvas, 1200);

            // Reset per-photo transforms & edits while keeping persisted size/bg/paper preferences
            state.rot90 = 0;
            state.flipH = false;
            state.straightenDeg = 0;
            state.zoomRel = 1.0;
            state.panX = 0;
            state.panY = 0;
            state.brightness = 100;
            state.contrast = 100;
            state.saturation = 100;
            state.autoEnhance = false;
            state.brushActive = false;
            state.smartRawMask = null;
            state.lastSingleInfo = '';
            state.lastSingleWarning = '';

            rebuildOrientedPreview();
            hideBusy();
            setBannerText(uploadStatus, '', '');
            goToStep(2);
            syncAllUi();
            haptic('success');
        } catch (err) {
            hideBusy();
            setBannerText(uploadStatus, err && err.message ? err.message : 'Could not load that photo. Please try a JPG or PNG image.', 'error');
            playStudioSound('error');
        }
    }

    function goToStep(stepNum) {
        if (stepNum > 1 && !state.originalCanvas) return;
        state.step = stepNum;

        const stepEls = [
            document.getElementById('ps-step-1'),
            document.getElementById('ps-step-2'),
            document.getElementById('ps-step-3')
        ];
        stepEls.forEach((el, idx) => {
            if (el) el.style.display = (idx + 1 === stepNum) ? 'block' : 'none';
        });

        document.querySelectorAll('.ps-stepper-btn').forEach(btn => {
            const s = Number(btn.dataset.step);
            btn.classList.toggle('active', s === stepNum);
            btn.classList.toggle('done', s < stepNum && Boolean(state.originalCanvas));
            btn.disabled = s > 1 && !state.originalCanvas;
            btn.setAttribute('aria-current', s === stepNum ? 'step' : 'false');
        });

        const startOverBtn = document.getElementById('ps-startover-btn');
        if (startOverBtn) startOverBtn.style.display = state.originalCanvas ? 'inline-flex' : 'none';

        if (stepNum === 2) {
            requestAnimationFrame(() => {
                computeViewportGeometry();
                renderViewport();
            });
        } else if (stepNum === 3) {
            state.brushActive = false;
            syncBrushUi();
            updateSingleExportSummary();
            renderSinglePreviewThumb();
            renderPrintSheetPreview();
        }
    }

    function renderSinglePreviewThumb() {
        const previewCanvas = document.getElementById('ps-single-preview');
        if (!previewCanvas || !state.orientedPreviewCanvas) return;
        const size = getSelectedSizeMm();
        const aspect = size.wMm / size.hMm;
        const h = 220;
        const w = Math.max(60, Math.round(h * aspect));
        const rendered = renderCroppedPhotoCanvas(w, h, true);
        if (!rendered) return;
        previewCanvas.width = w;
        previewCanvas.height = h;
        previewCanvas.getContext('2d').drawImage(rendered, 0, 0);
        releaseCanvas(rendered);
    }

    function startOver() {
        if (state.workingCanvas && state.workingCanvas !== state.originalCanvas) {
            releaseCanvas(state.workingCanvas);
        }
        releaseCanvas(state.originalCanvas);
        releaseCanvas(state.previewCanvas);
        releaseCanvas(state.orientedPreviewCanvas);
        releaseCanvas(state.compositedPreviewCanvas);
        releaseCanvas(state.baseMaskCanvas);
        releaseCanvas(state.brushOverrideCanvas);
        releaseCanvas(state.sheetThumbCanvas);

        state.originalCanvas = null;
        state.workingCanvas = null;
        state.previewCanvas = null;
        state.orientedPreviewCanvas = null;
        state.compositedPreviewCanvas = null;
        state.baseMaskCanvas = null;
        state.brushOverrideCanvas = null;
        state.sheetThumbCanvas = null;
        state.smartRawMask = null;
        state.brushUndoStack = [];
        state.brushActive = false;
        state.rot90 = 0;
        state.flipH = false;
        state.straightenDeg = 0;
        state.zoomRel = 1.0;
        state.panX = 0;
        state.panY = 0;
        state.brightness = 100;
        state.contrast = 100;
        state.saturation = 100;
        state.autoEnhance = false;
        state.lastSingleInfo = '';
        state.lastSingleWarning = '';

        const gIn = document.getElementById('passport-input');
        const cIn = document.getElementById('ps-camera-input');
        if (gIn) gIn.value = '';
        if (cIn) cIn.value = '';

        setBannerText(document.getElementById('ps-autofit-note'), '', '');
        setBannerText(document.getElementById('ps-bg-status'), '', '');
        setBannerText(document.getElementById('ps-single-status'), '', '');
        setBannerText(document.getElementById('ps-sheet-status'), '', '');

        goToStep(1);
        haptic('click');
    }

    // =====================================================
    // UI ACTIONS & SYNCHRONIZATION
    // =====================================================

    function setEditTab(tab) {
        state.editTab = tab;
        if (tab !== 'bg' && state.brushActive) {
            state.brushActive = false;
            syncBrushUi();
        }
        document.querySelectorAll('.ps-edit-tab').forEach(btn => {
            const active = btn.dataset.tab === tab;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('.ps-edit-pane').forEach(pane => {
            pane.style.display = pane.dataset.pane === tab ? 'block' : 'none';
        });
        haptic('click');
    }

    function setExportTab(tab) {
        state.exportTab = tab;
        document.querySelectorAll('.ps-export-tab').forEach(btn => {
            const active = btn.dataset.etab === tab;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        const singlePane = document.getElementById('ps-export-single');
        const sheetPane = document.getElementById('ps-export-sheet');
        if (singlePane) singlePane.style.display = tab === 'single' ? 'block' : 'none';
        if (sheetPane) sheetPane.style.display = tab === 'sheet' ? 'block' : 'none';
        if (tab === 'sheet') {
            requestAnimationFrame(renderPrintSheetPreview);
        } else {
            renderSinglePreviewThumb();
        }
        haptic('click');
    }

    function setZoomRelative(val) {
        state.zoomRel = Math.max(1.0, Math.min(5.0, Number(val) || 1.0));
        state.sheetThumbDirty = true;
        scheduleViewportRender();
    }

    function nudgePosition(dxPct, dyPct) {
        if (!state.orientedPreviewCanvas) return;
        state.panX += dxPct / 100;
        state.panY += dyPct / 100;
        state.sheetThumbDirty = true;
        scheduleViewportRender();
    }

    function startNudgeRepeat(dxPct, dyPct) {
        stopNudgeRepeat();
        nudgePosition(dxPct, dyPct);
        haptic('click');
        state.nudgeTimer = setTimeout(() => {
            state.nudgeInterval = setInterval(() => nudgePosition(dxPct, dyPct), 70);
        }, 320);
    }

    function stopNudgeRepeat() {
        if (state.nudgeTimer) { clearTimeout(state.nudgeTimer); state.nudgeTimer = null; }
        if (state.nudgeInterval) { clearInterval(state.nudgeInterval); state.nudgeInterval = null; }
    }

    function openSizeSheet() {
        const sheet = document.getElementById('ps-size-sheet');
        if (!sheet) return;
        renderSizeSheetList();
        sheet.classList.add('active');
        sheet.setAttribute('aria-hidden', 'false');
        haptic('click');
    }

    function closeSizeSheet() {
        const sheet = document.getElementById('ps-size-sheet');
        if (!sheet) return;
        sheet.classList.remove('active');
        sheet.setAttribute('aria-hidden', 'true');
    }

    function renderSizeSheetList() {
        const body = document.getElementById('ps-size-sheet-list');
        if (!body) return;
        body.textContent = '';

        SIZE_GROUPS.forEach(group => {
            const heading = document.createElement('div');
            heading.className = 'ps-sheet-group-title';
            heading.textContent = group.group;
            body.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'ps-size-preset-grid';

            group.items.forEach(item => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ps-size-preset-item' + (state.sizeId === item.id ? ' active' : '');
                btn.addEventListener('click', () => {
                    state.sizeId = item.id;
                    savePrefs();
                    state.sheetThumbDirty = true;
                    syncSizeUi();
                    scheduleViewportRender();
                    closeSizeSheet();
                    haptic('click');
                });

                const top = document.createElement('div');
                top.className = 'ps-size-preset-top';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'ps-size-preset-name';
                nameSpan.textContent = item.name;
                const px = calcOutputPixels(item.wMm, item.hMm, state.dpi);
                const pxSpan = document.createElement('span');
                pxSpan.className = 'ps-size-preset-px';
                pxSpan.textContent = `${px.w}×${px.h} px`;
                top.appendChild(nameSpan);
                top.appendChild(pxSpan);

                const note = document.createElement('div');
                note.className = 'ps-size-preset-note';
                note.textContent = item.note;

                btn.appendChild(top);
                btn.appendChild(note);
                grid.appendChild(btn);
            });
            body.appendChild(grid);
        });

        // Sync custom inputs inside bottom sheet
        const cw = document.getElementById('ps-custom-w');
        const ch = document.getElementById('ps-custom-h');
        const cu = document.getElementById('ps-custom-unit');
        if (cw) cw.value = state.customW;
        if (ch) ch.value = state.customH;
        if (cu) cu.value = state.customUnit;
    }

    function applyCustomSizeFromSheet() {
        const w = parseFloat(document.getElementById('ps-custom-w')?.value);
        const h = parseFloat(document.getElementById('ps-custom-h')?.value);
        const unit = document.getElementById('ps-custom-unit')?.value || 'mm';
        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
            showToastSafe('Enter valid positive width and height.');
            return;
        }
        state.sizeId = 'custom';
        state.customW = w;
        state.customH = h;
        state.customUnit = unit;
        savePrefs();
        state.sheetThumbDirty = true;
        syncSizeUi();
        scheduleViewportRender();
        closeSizeSheet();
        haptic('success');
    }

    function syncSizeUi() {
        const size = getSelectedSizeMm();
        const px = calcOutputPixels(size.wMm, size.hMm, state.dpi);
        const summary = `${px.w} × ${px.h} px at ${state.dpi} DPI (${size.labelDims})`;

        const barChip = document.getElementById('ps-canvas-size-chip');
        if (barChip) barChip.textContent = `${size.labelDims} · ${px.w}×${px.h} px`;

        const pickerVal = document.getElementById('ps-size-current-label');
        if (pickerVal) {
            pickerVal.textContent = size.name === size.labelDims
                ? size.name
                : `${size.name} (${size.labelDims})`;
        }

        const readout = document.getElementById('ps-size-px-readout');
        if (readout) readout.textContent = summary;

        document.querySelectorAll('.ps-dpi-btn').forEach(btn => {
            btn.classList.toggle('active', Number(btn.dataset.dpi) === state.dpi);
        });

        updateSingleExportSummary();
    }

    function syncScaleUi() {
        const slider = document.getElementById('ps-scale-slider');
        const label = document.getElementById('ps-scale-val');
        if (slider && Math.abs(parseFloat(slider.value) - state.zoomRel) > 0.005) {
            slider.value = state.zoomRel.toFixed(2);
        }
        if (label) label.textContent = `${state.zoomRel.toFixed(2)}×`;
    }

    function syncTransformControls() {
        const strSlider = document.getElementById('ps-straighten-slider');
        const strVal = document.getElementById('ps-straighten-val');
        if (strSlider) strSlider.value = String(state.straightenDeg);
        if (strVal) strVal.textContent = `${state.straightenDeg > 0 ? '+' : ''}${state.straightenDeg.toFixed(1)}°`;
        syncScaleUi();

        const guideToggle = document.getElementById('ps-guides-toggle');
        if (guideToggle) guideToggle.checked = state.showGuides;
    }

    function syncBgUi() {
        document.querySelectorAll('.ps-bg-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bgmode === state.bgMode);
        });
        document.querySelectorAll('.ps-swatch-btn').forEach(btn => {
            btn.classList.toggle('active', (btn.dataset.hex || '').toUpperCase() === (state.bgColor || '').toUpperCase());
        });
        const customColor = document.getElementById('ps-bg-custom-color');
        if (customColor) customColor.value = state.bgColor;

        const plainControls = document.getElementById('ps-plain-controls');
        const smartControls = document.getElementById('ps-smart-controls');
        const brushSection = document.getElementById('ps-brush-section');

        if (plainControls) plainControls.style.display = state.bgMode === 'plain' ? 'block' : 'none';
        if (smartControls) smartControls.style.display = state.bgMode === 'smart' ? 'block' : 'none';
        if (brushSection) brushSection.style.display = state.bgMode !== 'original' ? 'block' : 'none';

        const tolSlider = document.getElementById('ps-plain-tol');
        const tolVal = document.getElementById('ps-plain-tol-val');
        if (tolSlider) tolSlider.value = String(state.plainTolerance);
        if (tolVal) tolVal.textContent = String(state.plainTolerance);

        const pFea = document.getElementById('ps-plain-feather');
        const pFeaVal = document.getElementById('ps-plain-feather-val');
        if (pFea) pFea.value = String(state.plainFeather);
        if (pFeaVal) pFeaVal.textContent = `${state.plainFeather} px`;

        const sThr = document.getElementById('ps-smart-thresh');
        const sThrVal = document.getElementById('ps-smart-thresh-val');
        if (sThr) sThr.value = String(Math.round(state.smartThreshold * 100));
        if (sThrVal) sThrVal.textContent = `${Math.round(state.smartThreshold * 100)}%`;

        const sFea = document.getElementById('ps-smart-feather');
        const sFeaVal = document.getElementById('ps-smart-feather-val');
        if (sFea) sFea.value = String(state.smartFeather);
        if (sFeaVal) sFeaVal.textContent = `${state.smartFeather} px`;

        syncBrushUi();
    }

    function syncBrushUi() {
        const toggleBtn = document.getElementById('ps-brush-toggle');
        const controls = document.getElementById('ps-brush-controls');
        const indicator = document.getElementById('ps-brush-canvas-badge');
        const canBrush = state.bgMode !== 'original';
        if (!canBrush) state.brushActive = false;

        if (toggleBtn) {
            toggleBtn.classList.toggle('active', state.brushActive);
            toggleBtn.textContent = state.brushActive ? 'Done fixing edges' : 'Fix edges brush';
        }
        if (controls) controls.style.display = state.brushActive ? 'flex' : 'none';
        if (indicator) {
            indicator.style.display = state.brushActive ? 'flex' : 'none';
            if (state.brushActive) {
                indicator.textContent = `Brush: ${state.brushMode === 'erase' ? 'Erase' : 'Restore'} (${state.brushSize}) · Pinch with 2 fingers to zoom`;
            }
        }
        document.querySelectorAll('.ps-brush-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bmode === state.brushMode);
        });
        document.querySelectorAll('.ps-brush-size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bsize === state.brushSize);
        });
        updateBrushUndoBtn();
    }

    function syncRetouchUi() {
        const b = document.getElementById('ps-ret-brightness');
        const c = document.getElementById('ps-ret-contrast');
        const s = document.getElementById('ps-ret-saturation');
        if (b) b.value = String(state.brightness);
        if (c) c.value = String(state.contrast);
        if (s) s.value = String(state.saturation);
        const bv = document.getElementById('ps-ret-brightness-val');
        const cv = document.getElementById('ps-ret-contrast-val');
        const sv = document.getElementById('ps-ret-saturation-val');
        if (bv) bv.textContent = `${state.brightness}%`;
        if (cv) cv.textContent = `${state.contrast}%`;
        if (sv) sv.textContent = `${state.saturation}%`;

        const autoBtn = document.getElementById('ps-auto-enhance-btn');
        if (autoBtn) {
            autoBtn.classList.toggle('active', state.autoEnhance);
            autoBtn.textContent = state.autoEnhance ? 'Auto enhance: ON' : 'Auto enhance';
        }
    }

    function updateSingleExportSummary() {
        const size = getSelectedSizeMm();
        const px = calcOutputPixels(size.wMm, size.hMm, state.dpi);
        const metaEl = document.getElementById('ps-single-meta');
        if (metaEl) {
            metaEl.textContent = state.lastSingleInfo || `${px.w} × ${px.h} px · ${state.dpi} DPI · ${size.labelDims}`;
        }
        const warnEl = document.getElementById('ps-single-resize-warn');
        if (warnEl) {
            warnEl.textContent = state.lastSingleWarning || '';
            warnEl.style.display = state.lastSingleWarning ? 'block' : 'none';
        }
        document.querySelectorAll('.ps-fmt-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.fmt === state.singleFormat);
        });
        const kbToggle = document.getElementById('ps-kb-toggle');
        const kbBox = document.getElementById('ps-kb-controls');
        const kbPngNote = document.getElementById('ps-kb-png-note');
        if (kbToggle) kbToggle.checked = state.targetKbEnabled;
        if (kbBox) kbBox.style.display = state.targetKbEnabled ? 'block' : 'none';
        if (kbPngNote) {
            kbPngNote.style.display = (state.targetKbEnabled && state.singleFormat !== 'image/jpeg') ? 'block' : 'none';
        }
        const kbIn = document.getElementById('ps-kb-input');
        if (kbIn && document.activeElement !== kbIn) kbIn.value = String(state.targetKb);
    }

    function syncSheetControlsUi() {
        document.querySelectorAll('.ps-paper-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.paper === state.sheet.paper);
        });
        document.querySelectorAll('.ps-orient-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.orient === state.sheet.orientation);
        });
        document.querySelectorAll('.ps-border-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.border === state.sheet.border);
        });
        document.querySelectorAll('.ps-count-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cmode === state.sheet.countMode);
        });
        const mIn = document.getElementById('ps-sheet-margin');
        const gIn = document.getElementById('ps-sheet-gap');
        const cIn = document.getElementById('ps-sheet-count');
        const cWrap = document.getElementById('ps-sheet-count-wrap');
        if (mIn) mIn.value = String(state.sheet.marginMm);
        if (gIn) gIn.value = String(state.sheet.gapMm);
        if (cIn) cIn.value = String(state.sheet.customCount);
        if (cWrap) cWrap.style.display = state.sheet.countMode === 'custom' ? 'flex' : 'none';

        const capName = document.getElementById('ps-sheet-caption-name');
        const capDate = document.getElementById('ps-sheet-caption-date');
        if (capName && document.activeElement !== capName) capName.value = state.sheet.captionName;
        if (capDate) capDate.checked = state.sheet.captionDate;
    }

    function syncAllUi() {
        syncSizeUi();
        syncTransformControls();
        syncBgUi();
        syncRetouchUi();
        updateSingleExportSummary();
        syncSheetControlsUi();
    }

    // =====================================================
    // UTILITIES
    // =====================================================

    function yieldMain() {
        return new Promise(r => setTimeout(r, 0));
    }

    function sanitizeBaseName(name) {
        return String(name || 'passport-photo')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48) || 'passport-photo';
    }

    function setBannerText(el, msg, kind) {
        if (!el) return;
        el.textContent = msg || '';
        el.dataset.kind = kind || '';
        el.className = 'ps-inline-msg' + (kind ? ` ps-msg-${kind}` : '');
        el.style.display = msg ? 'block' : 'none';
    }

    function showBusy(text) {
        if (typeof global.showGlobalLoading === 'function') {
            global.showGlobalLoading(text, 'Passport Studio');
        }
    }

    function hideBusy() {
        if (typeof global.hideGlobalLoading === 'function') {
            global.hideGlobalLoading();
        }
    }

    function haptic(type) {
        if (typeof global.triggerHaptic === 'function') {
            global.triggerHaptic(type);
        }
    }

    function playStudioSound(type) {
        if (typeof global.playSound === 'function') {
            global.playSound(type);
        }
    }

    function showToastSafe(msg) {
        if (global.AndroidBridge && typeof global.AndroidBridge.showToast === 'function') {
            global.AndroidBridge.showToast(msg);
        } else {
            const el = document.getElementById('ps-upload-status');
            if (el) setBannerText(el, msg, 'warn');
        }
    }

    // =====================================================
    // EVENT BINDINGS & INIT
    // =====================================================

    function initStudio() {
        if (state.initialized) return;
        const root = document.getElementById('passport');
        if (!root) return;
        state.initialized = true;

        // Feature-detect camera capture support
        const cameraWrap = document.getElementById('ps-camera-btn-wrap');
        const supportsCapture = 'capture' in document.createElement('input');
        if (cameraWrap) cameraWrap.style.display = supportsCapture ? 'inline-flex' : 'none';

        // File inputs
        const galleryInput = document.getElementById('passport-input');
        if (galleryInput) {
            galleryInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) handleFileSelect(file);
            });
        }
        const cameraInput = document.getElementById('ps-camera-input');
        if (cameraInput) {
            cameraInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) handleFileSelect(file);
            });
        }

        // Stepper buttons
        document.querySelectorAll('.ps-stepper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = Number(btn.dataset.step);
                if (target === 1 || state.originalCanvas) {
                    goToStep(target);
                    haptic('click');
                }
            });
        });

        // Navigation buttons
        bindClick('ps-startover-btn', startOver);
        bindClick('ps-edit-back-btn', () => { goToStep(1); haptic('click'); });
        bindClick('ps-edit-next-btn', () => { goToStep(3); haptic('click'); });
        bindClick('ps-export-back-btn', () => { goToStep(2); haptic('click'); });

        // Edit tabs
        document.querySelectorAll('.ps-edit-tab').forEach(btn => {
            btn.addEventListener('click', () => setEditTab(btn.dataset.tab));
        });

        // Export tabs
        document.querySelectorAll('.ps-export-tab').forEach(btn => {
            btn.addEventListener('click', () => setExportTab(btn.dataset.etab));
        });

        // Canvas pointer interactions
        bindCanvasEvents();

        // Crop / Transform actions
        bindClick('ps-rot-left', () => {
            state.rot90 = (state.rot90 + 270) % 360;
            rebuildOrientedPreview();
            haptic('click');
        });
        bindClick('ps-rot-right', () => {
            state.rot90 = (state.rot90 + 90) % 360;
            rebuildOrientedPreview();
            haptic('click');
        });
        bindClick('ps-flip-h', () => {
            state.flipH = !state.flipH;
            rebuildOrientedPreview();
            haptic('click');
        });
        bindClick('ps-zoom-out', () => {
            setZoomRelative(state.zoomRel - 0.15);
            haptic('click');
        });
        bindClick('ps-zoom-in', () => {
            setZoomRelative(state.zoomRel + 0.15);
            haptic('click');
        });
        bindClick('ps-crop-reset', () => {
            state.rot90 = 0;
            state.flipH = false;
            state.straightenDeg = 0;
            state.zoomRel = 1.0;
            state.panX = 0;
            state.panY = 0;
            rebuildOrientedPreview();
            syncTransformControls();
            haptic('click');
        });
        bindClick('ps-center-btn', () => {
            state.panX = 0;
            state.panY = 0;
            state.sheetThumbDirty = true;
            scheduleViewportRender();
            haptic('click');
        });
        bindClick('ps-autofit-btn', runAutoFitFace);

        // Straighten slider
        const strSlider = document.getElementById('ps-straighten-slider');
        if (strSlider) {
            strSlider.addEventListener('input', (e) => {
                state.straightenDeg = parseFloat(e.target.value) || 0;
                const strVal = document.getElementById('ps-straighten-val');
                if (strVal) strVal.textContent = `${state.straightenDeg > 0 ? '+' : ''}${state.straightenDeg.toFixed(1)}°`;
                state.sheetThumbDirty = true;
                scheduleViewportRender();
            });
        }

        // Scale slider synced with pinch zoom
        const scaleSlider = document.getElementById('ps-scale-slider');
        if (scaleSlider) {
            scaleSlider.addEventListener('input', (e) => {
                setZoomRelative(parseFloat(e.target.value) || 1.0);
            });
        }

        // Nudge arrow pad (1% steps, hold to repeat)
        const bindNudge = (id, dx, dy) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('pointerdown', (e) => {
                if (e.cancelable) e.preventDefault();
                startNudgeRepeat(dx, dy);
            });
            el.addEventListener('pointerup', stopNudgeRepeat);
            el.addEventListener('pointercancel', stopNudgeRepeat);
            el.addEventListener('pointerleave', stopNudgeRepeat);
        };
        bindNudge('ps-nudge-up', 0, -1);
        bindNudge('ps-nudge-down', 0, 1);
        bindNudge('ps-nudge-left', -1, 0);
        bindNudge('ps-nudge-right', 1, 0);

        // Biometric guide toggle
        const guideToggle = document.getElementById('ps-guides-toggle');
        if (guideToggle) {
            guideToggle.addEventListener('change', (e) => {
                state.showGuides = Boolean(e.target.checked);
                scheduleViewportRender();
                haptic('click');
            });
        }

        // Size bottom sheet triggers
        bindClick('ps-open-size-sheet', openSizeSheet);
        bindClick('ps-canvas-size-chip', openSizeSheet);
        bindClick('ps-size-sheet-close', closeSizeSheet);
        bindClick('ps-apply-custom-size', applyCustomSizeFromSheet);
        const sheetOverlay = document.getElementById('ps-size-sheet');
        if (sheetOverlay) {
            sheetOverlay.addEventListener('click', (e) => {
                if (e.target === sheetOverlay) closeSizeSheet();
            });
        }

        // DPI selector
        document.querySelectorAll('.ps-dpi-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.dpi = Number(btn.dataset.dpi) || 300;
                savePrefs();
                syncSizeUi();
                haptic('click');
            });
        });

        // Background swatches & color picker
        const swatchWrap = document.getElementById('ps-bg-swatches');
        if (swatchWrap) {
            swatchWrap.textContent = '';
            BG_SWATCHES.forEach(sw => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ps-swatch-btn';
                btn.dataset.hex = sw.hex;
                btn.setAttribute('aria-label', `${sw.label} background`);
                btn.title = sw.label;
                const dot = document.createElement('span');
                dot.className = 'ps-swatch-dot';
                dot.style.backgroundColor = sw.hex;
                const txt = document.createElement('span');
                txt.textContent = sw.label;
                btn.appendChild(dot);
                btn.appendChild(txt);
                btn.addEventListener('click', () => {
                    state.bgColor = sw.hex;
                    if (state.bgMode === 'original') {
                        state.bgMode = 'plain';
                        buildPlainWallMask();
                    }
                    savePrefs();
                    syncBgUi();
                    rebuildCompositedPreview();
                    haptic('click');
                });
                swatchWrap.appendChild(btn);
            });
        }

        const customColor = document.getElementById('ps-bg-custom-color');
        if (customColor) {
            customColor.addEventListener('input', (e) => {
                state.bgColor = e.target.value || '#FFFFFF';
                if (state.bgMode === 'original') {
                    state.bgMode = 'plain';
                    buildPlainWallMask();
                }
                savePrefs();
                syncBgUi();
                rebuildCompositedPreview();
            });
        }

        // Background mode buttons
        document.querySelectorAll('.ps-bg-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.bgmode;
                state.bgMode = mode;
                savePrefs();
                setBannerText(document.getElementById('ps-bg-status'), '', '');
                syncBgUi();
                if (mode === 'original') {
                    releaseCanvas(state.baseMaskCanvas);
                    state.baseMaskCanvas = null;
                    rebuildCompositedPreview();
                } else if (mode === 'plain') {
                    buildPlainWallMask();
                    rebuildCompositedPreview();
                } else if (mode === 'smart') {
                    runSmartCutout(true);
                }
                haptic('click');
            });
        });

        // Plain wall sliders
        const tolSlider = document.getElementById('ps-plain-tol');
        if (tolSlider) {
            tolSlider.addEventListener('input', (e) => {
                state.plainTolerance = Number(e.target.value) || 35;
                const v = document.getElementById('ps-plain-tol-val');
                if (v) v.textContent = String(state.plainTolerance);
                clearTimeout(state.maskRebuildTimer);
                state.maskRebuildTimer = setTimeout(() => {
                    if (state.bgMode === 'plain') {
                        buildPlainWallMask();
                        rebuildCompositedPreview();
                    }
                }, 40);
            });
        }
        const pFea = document.getElementById('ps-plain-feather');
        if (pFea) {
            pFea.addEventListener('input', (e) => {
                state.plainFeather = parseFloat(e.target.value) || 0;
                const v = document.getElementById('ps-plain-feather-val');
                if (v) v.textContent = `${state.plainFeather} px`;
                clearTimeout(state.maskRebuildTimer);
                state.maskRebuildTimer = setTimeout(() => {
                    if (state.bgMode === 'plain') {
                        buildPlainWallMask();
                        rebuildCompositedPreview();
                    }
                }, 40);
            });
        }

        // Smart cut-out sliders
        const sThr = document.getElementById('ps-smart-thresh');
        if (sThr) {
            sThr.addEventListener('input', (e) => {
                state.smartThreshold = (Number(e.target.value) || 50) / 100;
                const v = document.getElementById('ps-smart-thresh-val');
                if (v) v.textContent = `${Math.round(state.smartThreshold * 100)}%`;
                if (state.smartRawMask) {
                    buildSmartMaskFromConfidence();
                    rebuildCompositedPreview();
                }
            });
        }
        const sFea = document.getElementById('ps-smart-feather');
        if (sFea) {
            sFea.addEventListener('input', (e) => {
                state.smartFeather = parseFloat(e.target.value) || 0;
                const v = document.getElementById('ps-smart-feather-val');
                if (v) v.textContent = `${state.smartFeather} px`;
                if (state.smartRawMask) {
                    buildSmartMaskFromConfidence();
                    rebuildCompositedPreview();
                }
            });
        }

        // Fix edges brush controls
        bindClick('ps-brush-toggle', () => {
            if (state.bgMode === 'original') return;
            state.brushActive = !state.brushActive;
            syncBrushUi();
            haptic('click');
        });
        document.querySelectorAll('.ps-brush-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.brushMode = btn.dataset.bmode;
                syncBrushUi();
                haptic('click');
            });
        });
        document.querySelectorAll('.ps-brush-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.brushSize = btn.dataset.bsize;
                syncBrushUi();
                haptic('click');
            });
        });
        bindClick('ps-brush-undo', undoBrushStroke);

        // Retouch controls
        const bindRetouchSlider = (id, key, valId) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', (e) => {
                state[key] = Number(e.target.value) || 100;
                const v = document.getElementById(valId);
                if (v) v.textContent = `${state[key]}%`;
                rebuildCompositedPreview();
            });
        };
        bindRetouchSlider('ps-ret-brightness', 'brightness', 'ps-ret-brightness-val');
        bindRetouchSlider('ps-ret-contrast', 'contrast', 'ps-ret-contrast-val');
        bindRetouchSlider('ps-ret-saturation', 'saturation', 'ps-ret-saturation-val');

        bindClick('ps-auto-enhance-btn', () => {
            state.autoEnhance = !state.autoEnhance;
            if (state.autoEnhance && !state.autoLevels) computeAutoLevels();
            syncRetouchUi();
            rebuildCompositedPreview();
            haptic('click');
        });
        bindClick('ps-retouch-reset', () => {
            state.brightness = 100;
            state.contrast = 100;
            state.saturation = 100;
            state.autoEnhance = false;
            syncRetouchUi();
            rebuildCompositedPreview();
            haptic('click');
        });

        // Export: Single photo
        document.querySelectorAll('.ps-fmt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.singleFormat = btn.dataset.fmt;
                state.lastSingleInfo = '';
                state.lastSingleWarning = '';
                updateSingleExportSummary();
                haptic('click');
            });
        });

        const kbToggle = document.getElementById('ps-kb-toggle');
        if (kbToggle) {
            kbToggle.addEventListener('change', (e) => {
                state.targetKbEnabled = Boolean(e.target.checked);
                if (state.targetKbEnabled && state.singleFormat !== 'image/jpeg') {
                    state.singleFormat = 'image/jpeg';
                }
                state.lastSingleInfo = '';
                state.lastSingleWarning = '';
                updateSingleExportSummary();
                haptic('click');
            });
        }
        document.querySelectorAll('.ps-kb-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                state.targetKb = Number(btn.dataset.kb) || 50;
                state.targetKbEnabled = true;
                state.singleFormat = 'image/jpeg';
                updateSingleExportSummary();
                haptic('click');
            });
        });
        const kbInput = document.getElementById('ps-kb-input');
        if (kbInput) {
            kbInput.addEventListener('input', (e) => {
                state.targetKb = parseFloat(e.target.value) || 50;
            });
        }

        bindClick('ps-single-download', () => handleSingleExport('download'));
        bindClick('ps-single-share', () => handleSingleExport('share'));

        // Export: Print Sheet
        document.querySelectorAll('.ps-paper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.sheet.paper = btn.dataset.paper;
                savePrefs();
                syncSheetControlsUi();
                renderPrintSheetPreview();
                haptic('click');
            });
        });
        document.querySelectorAll('.ps-orient-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.sheet.orientation = btn.dataset.orient;
                savePrefs();
                syncSheetControlsUi();
                renderPrintSheetPreview();
                haptic('click');
            });
        });
        document.querySelectorAll('.ps-border-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.sheet.border = btn.dataset.border;
                savePrefs();
                syncSheetControlsUi();
                renderPrintSheetPreview();
                haptic('click');
            });
        });
        document.querySelectorAll('.ps-count-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.sheet.countMode = btn.dataset.cmode;
                syncSheetControlsUi();
                renderPrintSheetPreview();
                haptic('click');
            });
        });

        const marginIn = document.getElementById('ps-sheet-margin');
        if (marginIn) {
            marginIn.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                state.sheet.marginMm = Number.isFinite(v) ? Math.max(0, Math.min(30, v)) : 0;
                savePrefs();
                renderPrintSheetPreview();
            });
        }
        const gapIn = document.getElementById('ps-sheet-gap');
        if (gapIn) {
            gapIn.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                state.sheet.gapMm = Number.isFinite(v) ? Math.max(0, Math.min(20, v)) : 0;
                savePrefs();
                renderPrintSheetPreview();
            });
        }
        const countIn = document.getElementById('ps-sheet-count');
        if (countIn) {
            countIn.addEventListener('input', (e) => {
                const v = parseInt(e.target.value, 10);
                state.sheet.customCount = Number.isFinite(v) ? Math.max(1, Math.min(60, v)) : 1;
                renderPrintSheetPreview();
            });
        }
        const capName = document.getElementById('ps-sheet-caption-name');
        if (capName) {
            capName.addEventListener('input', (e) => {
                state.sheet.captionName = e.target.value || '';
                renderPrintSheetPreview();
            });
        }
        const capDate = document.getElementById('ps-sheet-caption-date');
        if (capDate) {
            capDate.addEventListener('change', (e) => {
                state.sheet.captionDate = Boolean(e.target.checked);
                renderPrintSheetPreview();
                haptic('click');
            });
        }

        bindClick('ps-sheet-zoom-out', () => {
            state.sheet.previewZoom = Math.max(0.6, parseFloat((state.sheet.previewZoom - 0.25).toFixed(2)));
            renderPrintSheetPreview();
            haptic('click');
        });
        bindClick('ps-sheet-zoom-fit', () => {
            state.sheet.previewZoom = 1.0;
            renderPrintSheetPreview();
            haptic('click');
        });
        bindClick('ps-sheet-zoom-in', () => {
            state.sheet.previewZoom = Math.min(2.5, parseFloat((state.sheet.previewZoom + 0.25).toFixed(2)));
            renderPrintSheetPreview();
            haptic('click');
        });

        bindClick('ps-sheet-export-pdf', () => handleSheetExport('pdf', 'download'));
        bindClick('ps-sheet-export-jpg', () => handleSheetExport('jpg', 'download'));
        bindClick('ps-sheet-export-png', () => handleSheetExport('png', 'download'));
        bindClick('ps-sheet-share', () => handleSheetExport('pdf', 'share'));

        window.addEventListener('resize', () => {
            if (state.step === 2) scheduleViewportRender();
            if (state.step === 3 && state.exportTab === 'sheet') renderPrintSheetPreview();
        });

        // Re-measure canvas whenever the user switches back into the Passport tool panel
        if (typeof MutationObserver !== 'undefined') {
            const panelObserver = new MutationObserver(() => {
                if (root.classList.contains('active')) {
                    if (state.step === 2) {
                        requestAnimationFrame(() => {
                            computeViewportGeometry();
                            renderViewport();
                        });
                    } else if (state.step === 3 && state.exportTab === 'sheet') {
                        requestAnimationFrame(renderPrintSheetPreview);
                    }
                }
            });
            panelObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
        }

        syncAllUi();
        goToStep(1);
    }

    function bindClick(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }

    function handleBack() {
        const sizeSheet = document.getElementById('ps-size-sheet');
        if (sizeSheet && sizeSheet.classList.contains('active')) {
            closeSizeSheet();
            return true;
        }
        if (state.brushActive) {
            state.brushActive = false;
            syncBrushUi();
            return true;
        }
        const panel = document.getElementById('passport');
        if (!panel || !panel.classList.contains('active')) return false;
        if (state.step === 3) {
            goToStep(2);
            return true;
        }
        if (state.step === 2) {
            goToStep(1);
            return true;
        }
        return false;
    }

    // Compatible entry point for Smart Drop & input onchange
    function handlePassportUpload(input) {
        initStudio();
        if (!input || !input.files || !input.files.length) return;
        handleFileSelect(input.files[0]);
    }

    global.handlePassportUpload = handlePassportUpload;
    global.PassportStudio = {
        init: initStudio,
        handleFileSelect,
        handleBack,
        goToStep,
        startOver,
        calc: {
            unitToMm,
            mmToPx,
            mmToPt,
            calcOutputPixels,
            calcSheetLayout,
            setJpegDpi,
            SIZE_GROUPS,
            PAPER_SIZES
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStudio);
    } else {
        initStudio();
    }
})(typeof window !== 'undefined' ? window : globalThis);
