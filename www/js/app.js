/**
 * 1010Tool - Complete Utilities Suite Engine
 * 100% Client-side, Secure, Privacy-First
 */

// ==========================================
// 0. ERROR LOGGER & DIAGNOSTIC CONSOLE OVERLAY
// ==========================================

const errorLogger = {
    logs: [],
    maxLogs: 100,

    record(entry) {
        const item = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            type: entry.type || 'ERROR',
            message: entry.message || 'Unknown error',
            source: entry.source || 'runtime',
            line: entry.line || 0,
            col: entry.col || 0,
            stack: entry.stack || '',
            timestamp: entry.timestamp || new Date().toLocaleTimeString()
        };
        this.logs.unshift(item);
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
        window.__errorLogs = this.logs;
        this.renderOverlay();
        console.warn(`[1010Tool Diagnostic][${item.type}]`, item.message, item.stack || '');
    },

    clear() {
        this.logs = [];
        window.__errorLogs = [];
        this.renderOverlay();
    },

    renderOverlay() {
        const listEl = document.getElementById('debug-console-log-list');
        const badgeEl = document.getElementById('debug-console-count');
        const triggerBadge = document.getElementById('debug-trigger-badge');
        if (badgeEl) {
            badgeEl.innerText = `${this.logs.length} entries`;
        }
        if (triggerBadge) {
            triggerBadge.innerText = this.logs.length;
            triggerBadge.style.display = this.logs.length > 0 ? 'inline-flex' : 'none';
        }
        if (!listEl) return;

        if (this.logs.length === 0) {
            listEl.innerHTML = '<div style="color:var(--text-light);padding:30px 20px;text-align:center;font-family:\'JetBrains Mono\',monospace;font-size:0.8rem;">No errors logged. All systems operating normally.</div>';
            return;
        }

        listEl.innerHTML = this.logs.map(log => {
            let color = 'var(--error, #B91C1C)';
            if (log.type === 'UNHANDLED_REJECTION') color = 'var(--accent, #C84B31)';
            if (log.type === 'CDN_LOAD_FAILURE') color = 'var(--accent, #C84B31)';
            if (log.type === 'WARN') color = '#B45309';

            return `
                <div style="border-bottom:1px solid var(--border);padding:10px 14px;font-family:'JetBrains Mono',monospace;font-size:0.78rem;line-height:1.45;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                        <span style="background:var(--bg);color:${color};border:1px solid var(--border);font-weight:700;padding:2px 6px;border-radius:4px;font-size:0.68rem;">[${log.type}]</span>
                        <span style="color:var(--text-light);font-size:0.72rem;">${log.timestamp}</span>
                        ${log.source ? `<span style="color:var(--text-light);font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;">${escapeHtml(log.source)}${log.line ? ':' + log.line : ''}</span>` : ''}
                    </div>
                    <div style="color:var(--text);word-break:break-word;font-weight:500;">${escapeHtml(log.message)}</div>
                    ${log.stack ? `
                        <details style="margin-top:6px;">
                            <summary style="cursor:pointer;color:var(--accent);font-size:0.72rem;user-select:none;font-weight:600;">View Technical Stack Trace</summary>
                            <pre style="background:var(--bg);padding:8px 10px;border-radius:4px;overflow-x:auto;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:0.68rem;margin-top:4px;white-space:pre-wrap;border:1px solid var(--border);">${escapeHtml(log.stack)}</pre>
                        </details>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// User-Friendly Toast / Alert Banner (hides raw technical errors from users)
function showFriendlyToast(message, type = 'info') {
    let toast = document.getElementById('app-friendly-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-friendly-toast';
        toast.style.cssText = `
            position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
            background: var(--surface); color: var(--text);
            padding: 12px 16px; border-radius: 6px; box-shadow: var(--shadow);
            border: 1px solid var(--text);
            z-index: 10000; display: flex; align-items: center; gap: 10px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.85rem; max-width: 90vw; width: max-content; transition: all 0.2s ease;
        `;
        document.body.appendChild(toast);
    }
    const iconSvg = type === 'error'
        ? '<svg class="icon-svg" style="color:var(--error,#B91C1C);" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        : '<svg class="icon-svg" style="color:var(--accent,#C84B31);" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    toast.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:8px;line-height:1.3;">${iconSvg} <span>${escapeHtml(message)}</span></span>
        <button onclick="window.showDebugConsole()" aria-label="View diagnostic details" style="background:var(--bg);border:1px solid var(--border);color:var(--text);cursor:pointer;padding:4px 8px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:0.72rem;margin-left:6px;font-weight:600;white-space:nowrap;">Details</button>
        <button onclick="this.parentElement.style.display='none'" aria-label="Dismiss notification" style="background:none;border:none;color:var(--text-light);cursor:pointer;padding:2px 4px;display:inline-flex;align-items:center;"><svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    `;
    toast.style.display = 'flex';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        if (toast) toast.style.display = 'none';
    }, 6500);
}

// Global Window Error Handler
window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || '');
    if (msg.includes('ResizeObserver') || msg.includes('Script error') || msg.includes('rendernode') || msg.includes('canceled')) {
        return true;
    }
    errorLogger.record({
        type: 'ERROR',
        message: msg,
        source: source || 'window',
        line: lineno || 0,
        col: colno || 0,
        stack: error && error.stack ? error.stack : (new Error().stack || ''),
        timestamp: new Date().toLocaleTimeString()
    });
    return false;
};

// Global Unhandled Promise Rejection Handler
window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason;
    const msg = reason ? (reason.message || String(reason)) : 'Unhandled Promise Rejection';
    if (msg.includes('ResizeObserver') || msg.includes('abort') || msg.includes('canceled') || msg.includes('Navigation cancelled')) {
        return;
    }
    const stack = (reason && reason.stack) ? reason.stack : '';

    errorLogger.record({
        type: 'UNHANDLED_REJECTION',
        message: msg,
        source: 'Promise',
        line: 0,
        col: 0,
        stack: stack,
        timestamp: new Date().toLocaleTimeString()
    });
});

// CDN Dependency Registry & Pre-execution Validator
const CDN_REGISTRY = {
    pdfjsLib: { name: 'PDF.js Reader', cdn: 'libs/pdf.min.js' },
    PDFLib: { name: 'PDF-Lib Engine', cdn: 'libs/pdf-lib.min.js' },
    PDFEncryptLite: { name: 'PDF Encryption Engine', cdn: 'libs/pdf-encrypt.min.js' },
    PDFDecrypt: { name: 'PDF Decryption Engine', cdn: 'libs/pdf-decrypt.min.js' },
    JSZip: { name: 'JSZip Compressor', cdn: 'libs/jszip.min.js' },
    Cropper: { name: 'Cropper.js', cdn: 'libs/cropper.min.js' },
    QRCodeStyling: { name: 'QR Code Styling Engine', cdn: 'libs/qr-code-styling.js' }
};

function checkCdnDependencies(requiredDeps, toolId) {
    const missing = [];
    for (const dep of requiredDeps) {
        const info = CDN_REGISTRY[dep] || { name: dep };
        if (typeof window[dep] === 'undefined') {
            missing.push(info.name || dep);
            errorLogger.record({
                type: 'CDN_LOAD_FAILURE',
                message: `Required library '${dep}' (${info.name}) is missing from window scope.`,
                source: info.cdn || 'CDN',
                stack: `Pre-Execution Dependency Check:\nLibrary 'window.${dep}' is undefined.\nOnline status: ${navigator.onLine ? 'Connected' : 'Offline'}\nURL: ${location.href}`,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }
    if (missing.length > 0) {
        const friendlyMsg = `The required component (${missing.join(', ')}) failed to load. Please check your internet connection and refresh the page.`;
        if (toolId) {
            setStatus(toolId, 'error', `⚠️ ${friendlyMsg}`);
        }
        showFriendlyToast(friendlyMsg, 'error');
        return false;
    }
    return true;
}

// Hidden Diagnostic Console Overlay DOM Structure
function initDebugOverlay() {
    if (document.getElementById('debug-console-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'debug-console-overlay';
    overlay.style.cssText = `
        display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(20, 20, 19, 0.88);
        z-index: 99999; justify-content: center; align-items: center; padding: 15px; box-sizing: border-box;
    `;

    overlay.innerHTML = `
        <div style="background:var(--surface);border:1px solid var(--text);border-radius:6px;width:100%;max-width:750px;height:85vh;display:flex;flex-direction:column;box-shadow:var(--shadow);overflow:hidden;color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;">
            <!-- Header -->
            <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg);">
                <div style="display:flex;align-items:center;gap:10px;">
                    <svg class="icon-svg" style="color:var(--accent);" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    <strong style="font-family:'Instrument Serif',Georgia,serif;font-size:1.2rem;font-weight:400;color:var(--text);">Diagnostic Console & Error Logger</strong>
                    <span id="debug-console-count" style="background:var(--surface);border:1px solid var(--border);color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:0.72rem;padding:2px 8px;border-radius:4px;font-weight:700;">0 entries</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button onclick="copyDebugLogs()" aria-label="Copy diagnostic logs" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;gap:5px;"><svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button>
                    <button onclick="errorLogger.clear()" aria-label="Clear diagnostic logs" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;gap:5px;"><svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg> Clear</button>
                    <button onclick="window.hideDebugConsole()" aria-label="Close diagnostic console" style="background:var(--accent);border:1px solid var(--text);color:#FAF8F5;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.8rem;display:inline-flex;align-items:center;"><svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
            </div>

            <!-- System Diagnostics Status Bar -->
            <div id="debug-sys-bar" style="padding:10px 18px;background:var(--surface);border-bottom:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:0.72rem;display:flex;flex-wrap:wrap;gap:12px;color:var(--text-light);align-items:center;">
                <div>Network: <span id="debug-net-status" style="color:${navigator.onLine ? 'var(--success,#2D6A4F)' : 'var(--error,#B91C1C)'};font-weight:700;">${navigator.onLine ? 'ONLINE' : 'OFFLINE'}</span></div>
                <div>Protocol: <span style="color:var(--text);font-weight:600;">${location.protocol}</span></div>
                <div id="debug-deps-status" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
            </div>

            <!-- Log Entries List -->
            <div id="debug-console-log-list" style="flex:1;overflow-y:auto;background:var(--surface);">
                <div style="color:var(--text-light);padding:25px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:0.8rem;">No errors logged. All systems operating normally.</div>
            </div>

            <!-- Footer -->
            <div style="padding:10px 18px;border-top:1px solid var(--border);background:var(--bg);font-size:0.72rem;color:var(--text-light);display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace;">
                <span>Press Esc to close • Captured in real-time</span>
                <span>1010Tool Diagnostic Engine</span>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) window.hideDebugConsole();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display === 'flex') {
            window.hideDebugConsole();
        }
    });

    errorLogger.renderOverlay();
}

function updateDebugDependencies() {
    const container = document.getElementById('debug-deps-status');
    if (!container) return;
    const deps = ['PDFLib', 'pdfjsLib', 'JSZip', 'Cropper', 'QRCodeStyling'];
    container.innerHTML = deps.map(dep => {
        const loaded = typeof window[dep] !== 'undefined';
        return `<span style="background:var(--bg);color:${loaded ? 'var(--success,#2D6A4F)' : 'var(--error,#B91C1C)'};border:1px solid var(--border);padding:2px 6px;border-radius:4px;font-size:0.68rem;font-family:'JetBrains Mono',monospace;font-weight:600;">${dep}: ${loaded ? 'OK' : 'ERR'}</span>`;
    }).join('');
}

window.showDebugConsole = function () {
    initDebugOverlay();
    const overlay = document.getElementById('debug-console-overlay');
    if (overlay) {
        updateDebugDependencies();
        errorLogger.renderOverlay();
        overlay.style.display = 'flex';
    }
};

window.hideDebugConsole = function () {
    const overlay = document.getElementById('debug-console-overlay');
    if (overlay) overlay.style.display = 'none';
};

window.toggleDebugConsole = function () {
    const overlay = document.getElementById('debug-console-overlay');
    if (overlay && overlay.style.display === 'flex') {
        window.hideDebugConsole();
    } else {
        window.showDebugConsole();
    }
};

function copyDebugLogs() {
    const text = JSON.stringify(errorLogger.logs, null, 2);
    if (typeof safeCopyText === 'function') {
        safeCopyText(text, 'Diagnostic logs copied to clipboard!');
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
        alert('Diagnostic logs copied to clipboard!');
    }
}

// Global state
let files = {
    annotate: null,
    ocr: null,
    merge: [],
    split: null,
    img2pdf: [],
    pdf2img: null,
    compress: null,
    grayscale: null,
    rotate: null,
    'rotate-pages': null,
    crop: null,
    watermark: null,
    extract: null,
    lock: null,
    unlock: null,
    remove: null,
    numbering: null,
    metadata: null,
    rename: [],
    qrcode: null,
    sign: null,
    signImg: null,
    reverse: null,
    flatten: null,
    imgcompress: [],
    batchpdf: []
};

// Sound System
let soundEnabled = true;
let audioCtx = null;

function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
    } catch (e) {
        console.warn('Audio init note:', e);
    }
}

function playSound(type) {
    if (typeof triggerHaptic === 'function') {
        triggerHaptic(type);
    }
    if (!soundEnabled) return;
    try {
        initAudio();
        if (!audioCtx || audioCtx.state !== 'running') return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            osc.frequency.value = 750;
            osc.type = 'sine';
            gain.gain.value = 0.08;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.04);
        } else if (type === 'success') {
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.25);
            osc.type = 'triangle';
            gain.gain.value = 0.15;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } else if (type === 'error') {
            osc.frequency.value = 220;
            osc.type = 'sawtooth';
            gain.gain.value = 0.18;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        }
    } catch (e) {
        console.warn('Sound play failed:', e);
    }
}

document.addEventListener('click', () => initAudio(), { once: true });
document.addEventListener('touchstart', () => initAudio(), { once: true });

// UI Status & Progress Helpers
function showGlobalLoading(statusText, titleText) {
    try {
        const overlay = document.getElementById('global-loading-overlay') || document.getElementById('globalLoadingOverlay');
        if (!overlay) return;
        const textEl = document.getElementById('global-loading-text') || document.getElementById('globalLoadingText');
        const titleEl = document.getElementById('global-loading-title') || document.getElementById('globalLoadingTitle');
        if (textEl && statusText) {
            textEl.textContent = statusText;
        }
        if (titleEl) {
            titleEl.textContent = titleText || 'Processing...';
        }
        overlay.setAttribute('aria-hidden', 'false');
        overlay.classList.add('active');
        overlay.classList.add('open');
    } catch (e) {
        console.warn('showGlobalLoading error:', e);
    }
}
window.showGlobalLoading = showGlobalLoading;

function hideGlobalLoading() {
    try {
        const overlay = document.getElementById('global-loading-overlay') || document.getElementById('globalLoadingOverlay');
        if (!overlay) return;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.remove('active');
        overlay.classList.remove('open');
    } catch (e) {
        console.warn('hideGlobalLoading error:', e);
    }
}
window.hideGlobalLoading = hideGlobalLoading;

function setStatus(toolId, type, message) {
    const el = document.getElementById(toolId + '-status');
    if (el) {
        el.innerHTML = message;
        el.className = 'status ' + type;
        el.style.display = message ? 'block' : 'none';
    }
    const container = document.getElementById(toolId + '-prog');
    if (container) {
        if (type === 'loading') {
            // Show indeterminate shimmer if progress container isn't already active with a custom percentage
            if (container.style.display !== 'block' || container.classList.contains('indeterminate')) {
                setProgress(toolId, 'indeterminate');
            }
        } else if (type === 'success') {
            if (container.style.display === 'block') {
                setProgress(toolId, 100);
                setTimeout(() => {
                    setProgress(toolId, 0);
                }, 400);
            }
        } else if (type === 'error') {
            setProgress(toolId, 0);
        }
    }

    // Trigger or dismiss global loading overlay during PDF/Image processing
    if (type === 'loading') {
        const cleanText = (message || 'Processing files, please wait...')
            .replace(/<[^>]*>/g, '')
            .replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/u, '')
            .trim();
        showGlobalLoading(cleanText || 'Processing files, please wait...', 'Processing...');
    } else {
        hideGlobalLoading();
    }
}

function setProgress(toolId, percentage) {
    const container = document.getElementById(toolId + '-prog');
    if (container) {
        const fill = container.querySelector('.progress-fill');
        if (percentage === 'indeterminate' || percentage === -1 || percentage === true) {
            container.classList.add('indeterminate');
            if (fill) {
                fill.classList.add('indeterminate');
            }
            container.style.display = 'block';
        } else if (typeof percentage === 'number' && percentage > 0 && percentage < 100) {
            container.classList.remove('indeterminate');
            if (fill) {
                fill.classList.remove('indeterminate');
                fill.style.width = percentage + '%';
            }
            container.style.display = 'block';
        } else if (typeof percentage === 'number' && percentage >= 100) {
            container.classList.remove('indeterminate');
            if (fill) {
                fill.classList.remove('indeterminate');
                fill.style.width = '100%';
            }
            container.style.display = 'block';
        } else {
            container.classList.remove('indeterminate');
            if (fill) {
                fill.classList.remove('indeterminate');
                fill.style.width = '0%';
            }
            container.style.display = 'none';
        }
    }
}

let activeResultPreviewUrl = null;

function revokeResultPreviewUrl() {
    if (activeResultPreviewUrl) {
        try {
            URL.revokeObjectURL(activeResultPreviewUrl);
        } catch (_) {}
        activeResultPreviewUrl = null;
    }
}

function closeResultPreviewModal(event) {
    if (event && event.target && event.currentTarget && event.target !== event.currentTarget) {
        return;
    }
    const modal = document.getElementById('result-preview-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
    const previewBox = document.getElementById('result-preview-box');
    if (previewBox) {
        previewBox.innerHTML = '';
    }
    revokeResultPreviewUrl();
}
window.closeResultPreviewModal = closeResultPreviewModal;

function executeActualDownload(blob, filename, mimeType) {
    const resolvedMime = mimeType || (blob && blob.type) || 'application/octet-stream';
    if (window.AndroidBridge && window.AndroidBridge.downloadBlob) {
        const reader = new FileReader();
        reader.onloadend = function() {
            window.AndroidBridge.downloadBlob(reader.result, filename, resolvedMime);
        };
        reader.readAsDataURL(blob);
        return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        if (a.parentNode) {
            document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
    }, 200);
}
window.executeActualDownload = executeActualDownload;

const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));
window.yieldToMain = yieldToMain;

function downloadFile(data, filename, mimeType) {
    if (window.AndroidAds) window.AndroidAds.showInterstitial();
    const resolvedMime = mimeType || (data instanceof Blob && data.type) || 'application/octet-stream';
    const blob = data instanceof Blob ? data : new Blob([data], { type: resolvedMime });

    const modal = document.getElementById('result-preview-modal');
    const previewBox = document.getElementById('result-preview-box');
    const filenameEl = document.getElementById('result-preview-filename');
    const filesizeEl = document.getElementById('result-preview-filesize');
    const downloadBtn = document.getElementById('result-preview-download-btn');

    if (!modal || !previewBox || !downloadBtn) {
        executeActualDownload(blob, filename, resolvedMime);
        return;
    }

    // Revoke any previous preview Object URL before creating a new one
    revokeResultPreviewUrl();
    const previewUrl = URL.createObjectURL(blob);
    activeResultPreviewUrl = previewUrl;

    // Update filename and final file size
    if (filenameEl) {
        filenameEl.textContent = filename || 'output-file';
        filenameEl.title = filename || 'output-file';
    }
    if (filesizeEl) {
        filesizeEl.textContent = formatBytes(blob.size);
    }

    // Populate #result-preview-box based on MIME type
    previewBox.innerHTML = '';
    if (resolvedMime.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = previewUrl;
        img.alt = filename || 'Processed image preview';
        previewBox.appendChild(img);
    } else {
        const lowerName = (filename || '').toLowerCase();
        const isZip = resolvedMime.includes('zip') || lowerName.endsWith('.zip');
        const isPdf = resolvedMime.includes('pdf') || lowerName.endsWith('.pdf');
        const badgeLabel = isPdf ? 'PDF Document' : isZip ? 'ZIP Archive' : 'Processed Document';
        const svgMarkup = isZip
            ? `<svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M10 12h4"></path>
                <path d="M10 15h4"></path>
                <path d="M10 18h4"></path>
               </svg>`
            : `<svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
               </svg>`;
        previewBox.innerHTML = `
            <div class="result-preview-doc-icon">
                ${svgMarkup}
                <span class="result-preview-doc-badge">${badgeLabel}</span>
            </div>
        `;
    }

    // Bind Download button to executeActualDownload and then close the modal
    downloadBtn.onclick = function() {
        executeActualDownload(blob, filename, resolvedMime);
        closeResultPreviewModal();
    };

    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// File Upload Handler
function handleFiles(input, toolId) {
    if (!input.files || input.files.length === 0) return;
    const selectedFiles = Array.from(input.files);

    if (Array.isArray(files[toolId])) {
        // Append newly selected files, deduplicating
        const existing = files[toolId] || [];
        const newFiles = selectedFiles.filter(nf => !existing.some(ef => ef.name === nf.name && ef.size === nf.size));
        files[toolId] = [...existing, ...newFiles];
    } else {
        files[toolId] = selectedFiles[0];
    }

    // Reset input value to allow selecting the same file again
    input.value = '';

    renderFileList(toolId);
    updateToolButtonState(toolId);

    if (toolId === 'imgcompress' && typeof initImgCompressLivePreview === 'function') {
        initImgCompressLivePreview();
    }
    if (toolId === 'crop' && typeof applyCropPreset === 'function') {
        applyCropPreset();
    }

    // Interactive thumbnail generation for tools requiring page selection
    if (toolId === 'rotate-pages' || toolId === 'remove' || toolId === 'split') {
        renderPdfThumbnails(selectedFiles[0], toolId);
    }

    if (toolId === 'metadata' && selectedFiles[0] && typeof PDFLib !== 'undefined') {
        try {
            selectedFiles[0].arrayBuffer().then(buf => {
                PDFLib.PDFDocument.load(buf, { ignoreEncryption: true }).then(pdf => {
                    const titleEl = document.getElementById('meta-title');
                    const authorEl = document.getElementById('meta-author');
                    const creatorEl = document.getElementById('meta-creator');
                    if (titleEl && !titleEl.value) titleEl.value = pdf.getTitle() || '';
                    if (authorEl && !authorEl.value) authorEl.value = pdf.getAuthor() || '';
                    if (creatorEl && !creatorEl.value) creatorEl.value = pdf.getCreator() || '';
                }).catch(() => {});
            }).catch(() => {});
        } catch (_) {}
    }
}

function updateToolButtonState(toolId) {
    if (toolId === 'sign' || toolId === 'signImg') {
        const signBtn = document.getElementById('sign-btn');
        if (signBtn) {
            signBtn.disabled = !(files.sign && files.signImg);
        }
        return;
    }

    const btn = document.getElementById(toolId + '-btn');
    if (btn) {
        if (toolId === 'merge') {
            btn.disabled = !files.merge || files.merge.length < 2;
        } else if (toolId === 'lock') {
            const pass = (document.getElementById('lock-pass')?.value || '').trim();
            btn.disabled = !files.lock || !pass;
        } else if (toolId === 'unlock') {
            const pass = (document.getElementById('unlock-pass')?.value || '').trim();
            btn.disabled = !files.unlock || !pass;
        } else if (toolId === 'split') {
            const selectedPages = typeof getSplitSelectedPages === 'function' ? getSplitSelectedPages() : [];
            const hasGridItems = document.querySelectorAll('#split-grid .thumbnail-item').length > 0;
            btn.disabled = !files.split || (hasGridItems && selectedPages.length === 0);
        } else if (Array.isArray(files[toolId])) {
            btn.disabled = !files[toolId] || files[toolId].length === 0;
        } else {
            btn.disabled = !files[toolId];
        }
    }
}

function removeUploadedFile(toolId, index) {
    if (Array.isArray(files[toolId])) {
        files[toolId].splice(index, 1);
    } else {
        files[toolId] = null;
    }
    if (toolId === 'split') {
        splitPdfTotalPages = 0;
        const grid = document.getElementById('split-grid');
        if (grid) { grid.innerHTML = ''; grid.style.display = 'none'; }
        const controls = document.getElementById('split-range-controls');
        if (controls) controls.style.display = 'none';
        const rangeInput = document.getElementById('split-pages-range');
        if (rangeInput) rangeInput.value = '';
        const summary = document.getElementById('split-selection-summary');
        if (summary) summary.innerText = '0 pages selected';
        const badge = document.getElementById('split-page-count-badge');
        if (badge) badge.innerText = '0 Pages';
    }
    if (toolId === 'compress') {
        const opts = document.getElementById('compress-options-container');
        if (opts) opts.style.display = 'none';
        const resultBox = document.getElementById('compress-result-box');
        if (resultBox) resultBox.style.display = 'none';
        const prog = document.getElementById('compress-prog');
        if (prog) prog.style.display = 'none';
        const status = document.getElementById('compress-status');
        if (status) { status.innerText = ''; status.className = 'status'; }
    }
    if (toolId === 'imgcompress' && typeof initImgCompressLivePreview === 'function') {
        initImgCompressLivePreview();
    }
    renderFileList(toolId);
    updateToolButtonState(toolId);
}

let draggedMergeFileIndex = null;

// ==========================================================================
// PDF FILE THUMBNAIL CACHING & RENDERING ENGINE (Merge & Split Tools)
// ==========================================================================
const pdfFileThumbnailCache = new Map();

function getFileCacheKey(file) {
    if (!file) return '';
    return `${file.name}_${file.size}_${file.lastModified || 0}`;
}

async function renderPdfFirstPageThumbnail(file) {
    if (!file) return null;
    const key = getFileCacheKey(file);
    if (pdfFileThumbnailCache.has(key)) {
        return pdfFileThumbnailCache.get(key);
    }

    if (typeof pdfjsLib === 'undefined') {
        console.warn('pdfjsLib is not loaded');
        return { dataUrl: null, totalPages: 0, error: 'pdfjsLib not loaded' };
    }

    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            disableFontFace: false
        });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages || 1;
        const page = await pdf.getPage(1);

        // Target rendering width around 120px for crisp retina display on 44x58 container
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 120;
        const scale = targetWidth / Math.max(unscaledViewport.width, 1);
        const viewport = page.getViewport({ scale: Math.max(0.1, Math.min(scale, 1.5)) });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d', { alpha: false });

        // Fill crisp white background before rendering
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const result = {
            dataUrl: dataUrl,
            totalPages: totalPages,
            width: canvas.width,
            height: canvas.height,
            isEncrypted: false
        };

        // Cache result (capped to avoid memory bloat)
        if (pdfFileThumbnailCache.size > 150) {
            const firstKey = pdfFileThumbnailCache.keys().next().value;
            pdfFileThumbnailCache.delete(firstKey);
        }
        pdfFileThumbnailCache.set(key, result);
        return result;
    } catch (err) {
        console.warn(`PDF thumbnail error for ${file.name}:`, err);
        const isEncrypted = err && (err.name === 'PasswordException' || String(err.message).toLowerCase().includes('password'));
        const fallback = {
            dataUrl: null,
            isEncrypted: isEncrypted,
            totalPages: 0,
            error: err.message || 'Error'
        };
        pdfFileThumbnailCache.set(key, fallback);
        return fallback;
    }
}

function loadPdfThumbnailForElement(file, thumbContainer, pageCountBadge) {
    if (!file || !thumbContainer) return;
    const key = getFileCacheKey(file);

    const applyData = (thumbData) => {
        if (!thumbContainer || !thumbContainer.isConnected) return;
        if (thumbData && thumbData.dataUrl) {
            thumbContainer.innerHTML = `
                <img src="${thumbData.dataUrl}" class="file-thumb-img" alt="First page preview of ${escapeHtml(file.name)}" />
                <span class="file-thumb-badge" title="First page">P. 1</span>
            `;
            thumbContainer.title = `Preview of first page (${escapeHtml(file.name)}) - Click to expand`;
            thumbContainer.onclick = (e) => {
                e.stopPropagation();
                openPdfThumbModal(file.name, thumbData.dataUrl, thumbData.totalPages);
            };
            thumbContainer.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    thumbContainer.click();
                }
            };
            if (pageCountBadge && thumbData.totalPages > 0) {
                pageCountBadge.innerText = `${thumbData.totalPages} Page${thumbData.totalPages > 1 ? 's' : ''}`;
                pageCountBadge.style.display = 'inline-flex';
            }
        } else if (thumbData && thumbData.isEncrypted) {
            thumbContainer.innerHTML = `
                <div class="file-thumb-placeholder" style="color:var(--error);" title="Encrypted PDF (Password Protected)">
                    <span style="display:inline-flex;"><svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                    <span class="file-thumb-badge" style="background:var(--error);">Lock</span>
                </div>
            `;
            thumbContainer.title = `Encrypted PDF (${escapeHtml(file.name)})`;
            if (pageCountBadge) {
                pageCountBadge.innerText = 'Protected';
                pageCountBadge.style.display = 'inline-flex';
            }
        } else {
            thumbContainer.innerHTML = `
                <div class="file-thumb-placeholder" title="First page preview unavailable">
                    <span style="display:inline-flex;"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                </div>
            `;
        }
    };

    if (pdfFileThumbnailCache.has(key)) {
        applyData(pdfFileThumbnailCache.get(key));
    } else {
        renderPdfFirstPageThumbnail(file).then(thumbData => {
            applyData(thumbData);
        }).catch(() => {
            applyData(null);
        });
    }
}

function openPdfThumbModal(fileName, dataUrl, totalPages) {
    const modal = document.getElementById('pdf-thumb-modal');
    const titleEl = document.getElementById('pdf-thumb-modal-title');
    const imgEl = document.getElementById('pdf-thumb-modal-img');
    const pagesEl = document.getElementById('pdf-thumb-modal-pages');
    if (!modal || !dataUrl) return;

    if (titleEl) titleEl.innerText = fileName || 'PDF Preview';
    if (imgEl) imgEl.src = dataUrl;
    if (pagesEl) pagesEl.innerText = totalPages ? `First Page • Total ${totalPages} Page${totalPages > 1 ? 's' : ''}` : 'First Page';
    modal.classList.add('active');
    triggerHaptic('light');
}

function closePdfThumbModal(event) {
    if (event && event.target && event.target.closest('.pdf-thumb-modal-content')) return;
    const modal = document.getElementById('pdf-thumb-modal');
    if (modal) modal.classList.remove('active');
}
window.openPdfThumbModal = openPdfThumbModal;
window.closePdfThumbModal = closePdfThumbModal;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePdfThumbModal();
    }
});

function setupMergeDragAndDrop(item, idx, listEl) {
    // Desktop HTML5 Drag & Drop
    item.addEventListener('dragstart', (e) => {
        draggedMergeFileIndex = idx;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', idx.toString());
        setTimeout(() => {
            item.classList.add('dragging');
        }, 0);
        triggerHaptic('light');
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
            item.classList.add('drag-over-top');
            item.classList.remove('drag-over-bottom');
        } else {
            item.classList.add('drag-over-bottom');
            item.classList.remove('drag-over-top');
        }
    });

    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over-top', 'drag-over-bottom');
        const fromIndex = draggedMergeFileIndex;
        const dropTargetIndex = parseInt(item.dataset.index, 10);
        if (fromIndex !== null && fromIndex !== undefined && !isNaN(fromIndex) && !isNaN(dropTargetIndex)) {
            reorderMergeFiles(fromIndex, dropTargetIndex);
        }
    });

    item.addEventListener('dragend', () => {
        draggedMergeFileIndex = null;
        listEl.querySelectorAll('.file-item-merge').forEach(el => {
            el.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
        });
    });

    // Touch Drag & Drop for Touchscreens & Android WebView
    const handle = item.querySelector('.file-drag-handle');
    if (handle) {
        let isTouchDragging = false;
        let currentHoverItem = null;

        handle.addEventListener('touchstart', () => {
            draggedMergeFileIndex = idx;
            isTouchDragging = true;
            item.classList.add('dragging');
            triggerHaptic('light');
        }, { passive: true });

        handle.addEventListener('touchmove', (e) => {
            if (!isTouchDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetItem = elemBelow?.closest('.file-item-merge');

            listEl.querySelectorAll('.file-item-merge').forEach(el => {
                if (el !== targetItem) el.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            if (targetItem && targetItem !== item) {
                currentHoverItem = targetItem;
                const rect = targetItem.getBoundingClientRect();
                if (touch.clientY < rect.top + rect.height / 2) {
                    targetItem.classList.add('drag-over-top');
                    targetItem.classList.remove('drag-over-bottom');
                } else {
                    targetItem.classList.add('drag-over-bottom');
                    targetItem.classList.remove('drag-over-top');
                }
            } else {
                currentHoverItem = null;
            }
        }, { passive: false });

        handle.addEventListener('touchend', () => {
            if (!isTouchDragging) return;
            isTouchDragging = false;
            item.classList.remove('dragging');
            if (currentHoverItem) {
                const targetIdx = parseInt(currentHoverItem.dataset.index, 10);
                currentHoverItem.classList.remove('drag-over-top', 'drag-over-bottom');
                if (!isNaN(targetIdx) && targetIdx !== idx) {
                    reorderMergeFiles(idx, targetIdx);
                }
            }
            currentHoverItem = null;
            draggedMergeFileIndex = null;
        });

        handle.addEventListener('touchcancel', () => {
            isTouchDragging = false;
            item.classList.remove('dragging');
            listEl.querySelectorAll('.file-item-merge').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            currentHoverItem = null;
            draggedMergeFileIndex = null;
        });
    }
}

function reorderMergeFiles(fromIndex, toIndex) {
    if (!files.merge || !Array.isArray(files.merge)) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= files.merge.length) return;
    if (toIndex < 0 || toIndex >= files.merge.length) return;

    const [movedFile] = files.merge.splice(fromIndex, 1);
    files.merge.splice(toIndex, 0, movedFile);

    renderFileList('merge');
    triggerHaptic('click');
    if (typeof playSound === 'function') {
        try { playSound('click'); } catch (_) {}
    }
}
window.reorderMergeFiles = reorderMergeFiles;

function renderFileList(toolId) {
    try {
        const listEl = document.getElementById(toolId + '-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        const current = files[toolId];
        if (!current) return;

        const fileArray = Array.isArray(current) ? current : [current];
        if (fileArray.length === 0) return;

        // ==========================================
        // 1. MERGE PDFS (Multiple files + Thumbnails + Reordering)
        // ==========================================
        if (toolId === 'merge') {
            if (fileArray.length > 1) {
                const banner = document.createElement('div');
                banner.className = 'merge-reorder-banner';
                banner.innerHTML = `<span aria-hidden="true"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="7 15 12 20 17 15"/><polyline points="7 9 12 4 17 9"/></svg></span><span>Drag items or use arrows to change merge sequence</span>`;
                listEl.appendChild(banner);
            } else if (fileArray.length === 1) {
                const banner = document.createElement('div');
                banner.className = 'merge-reorder-banner';
                banner.style.background = 'var(--surface)';
                banner.style.color = 'var(--text)';
                banner.style.borderColor = 'var(--border)';
                banner.innerHTML = `<span aria-hidden="true"><svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span><span>1 PDF uploaded. Select at least 1 more PDF to merge them together.</span>`;
                listEl.appendChild(banner);
            }

            fileArray.forEach((f, idx) => {
                const item = document.createElement('div');
                item.className = 'file-item file-item-merge';
                if (fileArray.length > 1) {
                    item.setAttribute('draggable', 'true');
                }
                item.dataset.index = idx.toString();

                item.innerHTML = `
                    <div style="display:flex; align-items:center; flex:1; min-width:0; margin-right:8px;">
                        ${fileArray.length > 1 ? '<span class="file-drag-handle" title="Drag to reorder" aria-label="Drag handle" draggable="false">⠿</span>' : ''}
                        <span class="file-item-order-badge" title="Merge Order #${idx + 1}">${idx + 1}</span>
                        <div class="file-thumb-container" id="thumb-merge-${idx}" title="Preview of first page (${escapeHtml(f.name)})" role="button" tabindex="0" aria-label="First page thumbnail of ${escapeHtml(f.name)}">
                            <div class="file-thumb-placeholder"><div class="file-thumb-loading"></div></div>
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; color:var(--text);" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
                            <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-light); margin-top:2px; flex-wrap:wrap; font-family:'JetBrains Mono', monospace;">
                                <span>${formatBytes(f.size)}</span>
                                <span class="file-page-count-tag" id="page-count-merge-${idx}" style="display:none;"></span>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
                        ${fileArray.length > 1 ? `
                            <button type="button" class="file-move-btn" onclick="reorderMergeFiles(${idx}, ${idx - 1})" ${idx === 0 ? 'disabled' : ''} aria-label="Move ${escapeHtml(f.name)} up" title="Move up">▲</button>
                            <button type="button" class="file-move-btn" onclick="reorderMergeFiles(${idx}, ${idx + 1})" ${idx === fileArray.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeHtml(f.name)} down" title="Move down">▼</button>
                        ` : ''}
                        <button type="button" class="file-remove-btn" aria-label="Remove ${escapeHtml(f.name)}" onclick="removeUploadedFile('merge', ${idx})" title="Remove file">✕</button>
                    </div>
                `;

                listEl.appendChild(item);

                // Asynchronously render first-page PDF thumbnail with pdf.js
                const thumbEl = item.querySelector('.file-thumb-container');
                const badgeEl = item.querySelector('.file-page-count-tag');
                loadPdfThumbnailForElement(f, thumbEl, badgeEl);

                // Setup Desktop and Touch Drag & Drop if multiple files
                if (fileArray.length > 1) {
                    setupMergeDragAndDrop(item, idx, listEl);
                }
            });
            return;
        }

        // ==========================================
        // 2. SPLIT PDF (Single file + Thumbnail preview card)
        // ==========================================
        if (toolId === 'split') {
            const f = fileArray[0];
            const item = document.createElement('div');
            item.className = 'file-item-pdf-card';
            item.innerHTML = `
                <div style="display:flex; align-items:center; flex:1; min-width:0; margin-right:8px;">
                    <div class="file-thumb-container" id="thumb-split-0" title="Preview of first page (${escapeHtml(f.name)})" role="button" tabindex="0" aria-label="First page thumbnail of ${escapeHtml(f.name)}">
                        <div class="file-thumb-placeholder"><div class="file-thumb-loading"></div></div>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; color:var(--text); font-size:0.92rem;" title="${escapeHtml(f.name)}">
                            ${escapeHtml(f.name)}
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; font-size:0.78rem; color:var(--text-light); margin-top:3px; flex-wrap:wrap; font-family:'JetBrains Mono', monospace;">
                            <span>${formatBytes(f.size)}</span>
                            <span>•</span>
                            <span class="file-page-count-tag" id="page-count-split-0" style="margin-left:0;">Loading pages...</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
                    <button type="button" class="file-remove-btn" aria-label="Remove ${escapeHtml(f.name)}" onclick="removeUploadedFile('split', 0)" title="Remove PDF">✕</button>
                </div>
            `;
            listEl.appendChild(item);

            // Asynchronously render first-page PDF thumbnail with pdf.js
            const thumbEl = item.querySelector('.file-thumb-container');
            const badgeEl = item.querySelector('.file-page-count-tag');
            loadPdfThumbnailForElement(f, thumbEl, badgeEl);
            return;
        }

        // ==========================================
        // 3. GENERIC / OTHER TOOLS FILE LIST
        // ==========================================
        fileArray.forEach((f, idx) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.padding = '8px 12px';
            item.style.margin = '4px 0';
            item.style.borderRadius = '6px';
            item.style.background = 'var(--surface)';
            item.style.border = '1px solid var(--border)';
            item.innerHTML = `
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:65%; display:inline-flex; align-items:center; gap:6px; font-weight:600; color:var(--text);"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${escapeHtml(f.name)}</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:0.78rem; color:var(--text-light); font-family:'JetBrains Mono', monospace;">${formatBytes(f.size)}</span>
                    <button type="button" class="file-remove-btn" aria-label="Remove ${escapeHtml(f.name)}" onclick="removeUploadedFile('${toolId}', ${idx})">✕</button>
                </div>
            `;

            listEl.appendChild(item);
        });

        if (toolId === 'compress') {
            const opts = document.getElementById('compress-options-container');
            if (opts) opts.style.display = files.compress ? 'block' : 'none';
            const resultBox = document.getElementById('compress-result-box');
            if (resultBox && !files.compress) resultBox.style.display = 'none';
        }
    } catch (err) {
        console.error(`Error in renderFileList for ${toolId}:`, err);
    }
}

// PDF Thumbnail Renderer
async function renderPdfThumbnails(file, toolId) {
    if (!checkCdnDependencies(['pdfjsLib'], toolId)) return;
    const gridId = toolId + '-grid';
    const grid = document.getElementById(gridId);
    if (!grid) return;

    if (toolId === 'split') {
        const controls = document.getElementById('split-range-controls');
        if (controls) controls.style.display = 'flex';
        const summary = document.getElementById('split-selection-summary');
        if (summary) summary.innerText = 'Rendering pages preview...';
    }

    grid.style.display = 'grid';
    grid.innerHTML = '<div style="color:var(--text-light);font-size:0.85rem;padding:16px;text-align:center;grid-column:1/-1;">Rendering pages preview...</div>';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        grid.innerHTML = '';

        if (toolId === 'split') {
            splitPdfTotalPages = pdf.numPages;
            const badge = document.getElementById('split-page-count-badge');
            if (badge) badge.innerText = `${pdf.numPages} Page${pdf.numPages > 1 ? 's' : ''}`;
        }

        for (let i = 1; i <= pdf.numPages; i++) {
            await yieldToMain();
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.25 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            const item = document.createElement('div');
            // For split tool, default all pages to selected so user can split all or toggle off
            item.className = toolId === 'split' ? 'thumbnail-item selected' : 'thumbnail-item';
            item.dataset.page = i;
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.setAttribute('aria-label', `Page ${i}${toolId === 'split' ? ' (selected)' : ''}`);
            item.innerHTML = `
                <img src="${canvas.toDataURL()}" alt="Page ${i}" />
                <div class="page-num">${i}</div>
            `;

            item.onclick = () => {
                const isSelected = item.classList.toggle('selected');
                item.setAttribute('aria-label', `Page ${i}${isSelected ? ' (selected)' : ''}`);
                if (toolId === 'split') {
                    updateSplitSelectionSummary(true);
                } else {
                    updateGridSelection(gridId, toolId === 'remove' ? 'remove-pages' : 'rotate-pages-range');
                }
            };

            item.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            };

            grid.appendChild(item);
        }

        if (toolId === 'split') {
            updateSplitSelectionSummary(true);
        }
    } catch (e) {
        errorLogger.record({
            type: 'TOOL_ERROR',
            message: 'Failed to render PDF thumbnails: ' + e.message,
            source: 'renderPdfThumbnails',
            stack: e.stack
        });
        grid.innerHTML = '<div style="color:var(--error);font-size:0.85rem;padding:16px;text-align:center;grid-column:1/-1;">Failed to load PDF pages.</div>';
    }
}

function updateGridSelection(gridId, targetInputId) {
    const selected = Array.from(document.querySelectorAll(`#${gridId} .thumbnail-item.selected`))
        .map(el => el.dataset.page);
    const target = document.getElementById(targetInputId);
    if (target) target.value = selected.join(',');
}

// ==========================================
// Split PDF Visual Range Selection Helpers
// ==========================================
let splitPdfTotalPages = 0;

function formatPageRanges(pages) {
    if (!pages || pages.length === 0) return '';
    const sorted = [...new Set(pages.map(Number))].filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
    if (sorted.length === 0) return '';
    const ranges = [];
    let start = sorted[0];
    let prev = start;

    for (let i = 1; i < sorted.length; i++) {
        const curr = sorted[i];
        if (curr === prev + 1) {
            prev = curr;
        } else {
            ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
            start = curr;
            prev = curr;
        }
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    return ranges.join(', ');
}

function parsePageRanges(rangeStr, maxPages) {
    if (!rangeStr || typeof rangeStr !== 'string') return [];
    const pages = new Set();
    const parts = rangeStr.split(/[,;\s]+/);

    parts.forEach(part => {
        part = part.trim();
        if (!part) return;
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            if (!isNaN(start) && !isNaN(end)) {
                const low = Math.max(1, Math.min(start, end));
                const high = maxPages ? Math.min(maxPages, Math.max(start, end)) : Math.max(start, end);
                for (let p = low; p <= high; p++) {
                    pages.add(p);
                }
            }
        } else {
            const num = parseInt(part, 10);
            if (!isNaN(num) && num >= 1 && (!maxPages || num <= maxPages)) {
                pages.add(num);
            }
        }
    });
    return Array.from(pages).sort((a, b) => a - b);
}

function getSplitSelectedPages() {
    const grid = document.getElementById('split-grid');
    if (!grid) return [];
    return Array.from(grid.querySelectorAll('.thumbnail-item.selected'))
        .map(el => parseInt(el.dataset.page, 10))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
}

function updateSplitSelectionSummary(syncRangeInput = true) {
    const selected = getSplitSelectedPages();
    const count = selected.length;
    const total = splitPdfTotalPages || document.querySelectorAll('#split-grid .thumbnail-item').length;
    const summary = document.getElementById('split-selection-summary');
    const rangeInput = document.getElementById('split-pages-range');
    const btn = document.getElementById('split-btn');
    const modeEl = document.getElementById('split-mode');
    const mode = modeEl ? modeEl.value : 'zip';

    if (summary) {
        if (total === 0) {
            summary.innerText = '0 pages selected';
        } else if (count === total) {
            summary.innerText = `All ${total} pages selected`;
        } else if (count === 0) {
            summary.innerText = '0 pages selected (Select at least 1 page)';
        } else {
            summary.innerText = `${count} of ${total} pages selected (${formatPageRanges(selected)})`;
        }
    }

    if (syncRangeInput && rangeInput) {
        rangeInput.value = formatPageRanges(selected);
    }

    if (btn) {
        btn.disabled = !files.split || count === 0;
        const scissorsSvg = '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>';
        if (mode === 'single') {
            btn.innerHTML = count === 0 ? `${scissorsSvg} Extract Pages (Select at least 1)` : `${scissorsSvg} Extract ${count} Page${count > 1 ? 's' : ''} & Download`;
        } else {
            btn.innerHTML = count === 0 ? `${scissorsSvg} Split (Select at least 1)` : (count === total ? `${scissorsSvg} Split & Download` : `${scissorsSvg} Split ${count} Selected Pages & Download`);
        }
    }
}

function splitSelectAll(selectAll) {
    const items = document.querySelectorAll('#split-grid .thumbnail-item');
    items.forEach(item => {
        item.classList.toggle('selected', !!selectAll);
        const p = item.dataset.page;
        item.setAttribute('aria-label', `Page ${p}${selectAll ? ' (selected)' : ''}`);
    });
    updateSplitSelectionSummary(true);
}

function splitSelectOddEven(parity) {
    const items = document.querySelectorAll('#split-grid .thumbnail-item');
    items.forEach(item => {
        const p = parseInt(item.dataset.page, 10);
        const matches = parity === 'odd' ? (p % 2 !== 0) : (p % 2 === 0);
        item.classList.toggle('selected', matches);
        item.setAttribute('aria-label', `Page ${p}${matches ? ' (selected)' : ''}`);
    });
    updateSplitSelectionSummary(true);
}

function splitInvertSelection() {
    const items = document.querySelectorAll('#split-grid .thumbnail-item');
    items.forEach(item => {
        const isSelected = item.classList.toggle('selected');
        const p = item.dataset.page;
        item.setAttribute('aria-label', `Page ${p}${isSelected ? ' (selected)' : ''}`);
    });
    updateSplitSelectionSummary(true);
}

function onSplitRangeInput(rangeStr) {
    const total = splitPdfTotalPages || document.querySelectorAll('#split-grid .thumbnail-item').length;
    const pagesSet = new Set(parsePageRanges(rangeStr, total));
    const items = document.querySelectorAll('#split-grid .thumbnail-item');
    items.forEach(item => {
        const p = parseInt(item.dataset.page, 10);
        const isSelected = pagesSet.has(p);
        item.classList.toggle('selected', isSelected);
        item.setAttribute('aria-label', `Page ${p}${isSelected ? ' (selected)' : ''}`);
    });
    updateSplitSelectionSummary(false);
}

function applySplitRangeInput() {
    const rangeInput = document.getElementById('split-pages-range');
    if (rangeInput) {
        onSplitRangeInput(rangeInput.value);
        updateSplitSelectionSummary(true);
    }
}

function onSplitModeChange() {
    updateSplitSelectionSummary(false);
}

// ==========================================
// 1. PDF TOOLS IMPLEMENTATIONS
// ==========================================

async function processMerge() {
    const toolId = 'merge';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.merge || files.merge.length < 2) {
        setStatus(toolId, 'error', '⚠️ Please select 2 or more PDF files.');
        return;
    }

    try {
        setStatus(toolId, 'loading', '⏳ Merging PDFs...');
        setProgress(toolId, 20);

        const mergedPdf = await PDFLib.PDFDocument.create();
        for (let i = 0; i < files.merge.length; i++) {
            await yieldToMain();
            const fileData = await files.merge[i].arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(fileData);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(p => mergedPdf.addPage(p));
            setProgress(toolId, 20 + Math.round(((i + 1) / files.merge.length) * 60));
        }

        const mergedPdfBytes = await mergedPdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(mergedPdfBytes, '1010Tool-Merged.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✅ PDFs merged successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Merge failed: ' + e.message, source: 'processMerge', stack: e.stack });
        setStatus(toolId, 'error', '❌ Merge failed: ' + e.message);
        playSound('error');
    }
}

async function processSplit() {
    const toolId = 'split';
    if (!checkCdnDependencies(['PDFLib', 'JSZip'], toolId)) return;
    if (!files.split) return;

    try {
        const selectedPages = getSplitSelectedPages();
        if (!selectedPages || selectedPages.length === 0) {
            setStatus(toolId, 'error', '⚠️ Please select at least one page to split.');
            return;
        }

        if (typeof showGlobalLoading === 'function') {
            showGlobalLoading('Preparing to split PDF pages...', 'Split PDF');
        }
        setStatus(toolId, 'loading', '⏳ Splitting PDF...');
        setProgress(toolId, 20);

        const modeEl = document.getElementById('split-mode');
        const splitMode = modeEl ? modeEl.value : 'zip';

        const fileData = await files.split.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData);
        const totalPages = pdf.getPageCount();

        const validPages = selectedPages.filter(p => p >= 1 && p <= totalPages);
        if (validPages.length === 0) {
            if (typeof hideGlobalLoading === 'function') hideGlobalLoading();
            setStatus(toolId, 'error', '⚠️ Selected pages are out of range for this PDF.');
            return;
        }

        const originalName = files.split.name ? files.split.name.replace(/\.pdf$/i, '') : 'Document';

        if (splitMode === 'single') {
            if (typeof showGlobalLoading === 'function') {
                showGlobalLoading(`Extracting ${validPages.length} pages into a single PDF...`, 'Split PDF');
            }
            setStatus(toolId, 'loading', `⏳ Extracting ${validPages.length} pages into a single PDF...`);
            await yieldToMain();
            const newDoc = await PDFLib.PDFDocument.create();
            const indicesToCopy = validPages.map(p => p - 1);
            const copiedPages = await newDoc.copyPages(pdf, indicesToCopy);
            copiedPages.forEach(p => newDoc.addPage(p));
            setProgress(toolId, 85);

            const pdfBytes = await newDoc.save();
            if (typeof hideGlobalLoading === 'function') hideGlobalLoading();
            if (window.AndroidAds) window.AndroidAds.showInterstitial();
            downloadFile(pdfBytes, `${originalName}-Extracted-Pages.pdf`, 'application/pdf');
            setStatus(toolId, 'success', `✅ Extracted ${validPages.length} page${validPages.length > 1 ? 's' : ''} successfully!`);
            playSound('success');
        } else {
            if (typeof showGlobalLoading === 'function') {
                showGlobalLoading(`Splitting ${validPages.length} pages into separate PDFs...`, 'Split PDF');
            }
            const zip = new JSZip();
            for (let i = 0; i < validPages.length; i++) {
                await yieldToMain();
                const pageNum = validPages[i];
                if (typeof showGlobalLoading === 'function') {
                    showGlobalLoading(`Processing page ${pageNum} (${i + 1}/${validPages.length})...`, 'Split PDF');
                }
                const newDoc = await PDFLib.PDFDocument.create();
                const [copiedPage] = await newDoc.copyPages(pdf, [pageNum - 1]);
                newDoc.addPage(copiedPage);
                const pageBytes = await newDoc.save();
                zip.file(`${originalName}-Page-${pageNum}.pdf`, pageBytes);
                setProgress(toolId, 20 + Math.round(((i + 1) / validPages.length) * 65));
            }

            if (typeof showGlobalLoading === 'function') {
                showGlobalLoading('Compressing pages into ZIP package...', 'Split PDF');
            }
            setStatus(toolId, 'loading', '📦 Compressing ZIP package...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            if (typeof hideGlobalLoading === 'function') hideGlobalLoading();
            if (window.AndroidAds) window.AndroidAds.showInterstitial();
            downloadFile(zipBlob, `${originalName}-Split-Pages.zip`, 'application/zip');
            setStatus(toolId, 'success', `✅ Split ${validPages.length} page${validPages.length > 1 ? 's' : ''} into separate PDFs successfully!`);
            playSound('success');
        }
    } catch (e) {
        if (typeof hideGlobalLoading === 'function') hideGlobalLoading();
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Split failed: ' + e.message, source: 'processSplit', stack: e.stack });
        setStatus(toolId, 'error', '❌ Split failed: ' + e.message);
        playSound('error');
    }
}

async function processImgToPdf() {
    const toolId = 'img2pdf';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.img2pdf || files.img2pdf.length === 0) return;

    try {
        setStatus(toolId, 'loading', '⏳ Converting images to PDF...');
        setProgress(toolId, 20);

        const orient = document.getElementById('img2pdf-orient').value;
        const pdfDoc = await PDFLib.PDFDocument.create();

        for (let i = 0; i < files.img2pdf.length; i++) {
            await yieldToMain();
            const file = files.img2pdf[i];
            const imgBytes = await file.arrayBuffer();
            let embeddedImg;
            try {
                if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
                    embeddedImg = await pdfDoc.embedPng(imgBytes);
                } else {
                    embeddedImg = await pdfDoc.embedJpg(imgBytes);
                }
            } catch (_) {
                const img = await loadImageFromFile(file);
                const cvs = document.createElement('canvas');
                cvs.width = img.width;
                cvs.height = img.height;
                const ctx = cvs.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const fallbackBlob = await new Promise(r => cvs.toBlob(r, 'image/jpeg', 0.9));
                embeddedImg = await pdfDoc.embedJpg(await fallbackBlob.arrayBuffer());
            }

            const isLandscape = orient === 'landscape';
            const pageWidth = isLandscape ? 842 : 595;
            const pageHeight = isLandscape ? 595 : 842;
            const page = pdfDoc.addPage([pageWidth, pageHeight]);

            const imgDims = embeddedImg.scaleToFit(pageWidth - 40, pageHeight - 40);
            page.drawImage(embeddedImg, {
                x: (pageWidth - imgDims.width) / 2,
                y: (pageHeight - imgDims.height) / 2,
                width: imgDims.width,
                height: imgDims.height
            });
            setProgress(toolId, 20 + Math.round(((i + 1) / files.img2pdf.length) * 70));
        }

        const pdfBytes = await pdfDoc.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Images.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✅ Images converted to PDF successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Img2Pdf failed: ' + e.message, source: 'processImgToPdf', stack: e.stack });
        setStatus(toolId, 'error', '❌ Conversion failed: ' + e.message);
        playSound('error');
    }
}

async function processPdfToImg() {
    const toolId = 'pdf2img';
    if (!checkCdnDependencies(['pdfjsLib', 'JSZip'], toolId)) return;
    if (!files.pdf2img) return;

    try {
        setStatus(toolId, 'loading', '⏳ Rendering PDF pages as images...');
        setProgress(toolId, 15);

        const format = document.getElementById('pdf2img-format').value;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const fileData = await files.pdf2img.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;

        const zip = new JSZip();
        for (let i = 1; i <= pdf.numPages; i++) {
            await yieldToMain();
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            await page.render({ canvasContext: ctx, viewport }).promise;
            const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.92));
            zip.file(`1010Tool-Page-${i}.${format}`, blob);
            setProgress(toolId, 15 + Math.round((i / pdf.numPages) * 75));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(zipBlob, '1010Tool-PDF-Images.zip', 'application/zip');
        setStatus(toolId, 'success', '✅ PDF converted to images successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'PdfToImg failed: ' + e.message, source: 'processPdfToImg', stack: e.stack });
        setStatus(toolId, 'error', '❌ Conversion failed: ' + e.message);
        playSound('error');
    }
}

let lastCompressedPdfData = null;
let lastCompressedPdfName = '1010Tool-Compressed.pdf';

function selectCompressPreset(preset) {
    document.querySelectorAll('.compress-preset-card').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
    });
    const card = document.getElementById(`preset-${preset}`);
    if (card) {
        card.classList.add('active');
        card.setAttribute('aria-checked', 'true');
    }

    const customControls = document.getElementById('compress-custom-controls');
    if (preset === 'custom') {
        if (customControls) customControls.style.display = 'block';
    } else {
        if (customControls) customControls.style.display = 'none';
        const qSlider = document.getElementById('compress-quality');
        const qVal = document.getElementById('q-val');
        const dpiSelect = document.getElementById('compress-dpi');
        const modeSelect = document.getElementById('compress-mode');

        if (modeSelect) modeSelect.value = 'smart';

        if (preset === 'extreme') {
            if (qSlider) qSlider.value = '0.45';
            if (qVal) qVal.innerText = '45%';
            if (dpiSelect) dpiSelect.value = '0.95';
        } else if (preset === 'recommended') {
            if (qSlider) qSlider.value = '0.65';
            if (qVal) qVal.innerText = '65%';
            if (dpiSelect) dpiSelect.value = '1.33';
        } else if (preset === 'high') {
            if (qSlider) qSlider.value = '0.82';
            if (qVal) qVal.innerText = '82%';
            if (dpiSelect) dpiSelect.value = '1.75';
        }
    }
}

async function processCompress() {
    const toolId = 'compress';
    if (!checkCdnDependencies(['PDFLib', 'pdfjsLib'], toolId)) return;
    if (!files.compress) return;

    const file = files.compress;
    const originalSize = file.size;

    const resultBox = document.getElementById('compress-result-box');
    if (resultBox) resultBox.style.display = 'none';

    try {
        setStatus(toolId, 'loading', '⏳ Analyzing PDF document...');
        setProgress(toolId, 5);

        // Determine settings based on active preset / custom controls
        let activePreset = 'recommended';
        const activeCard = document.querySelector('.compress-preset-card.active');
        if (activeCard && activeCard.id) {
            activePreset = activeCard.id.replace('preset-', '');
        }

        let quality = 0.65;
        let scale = 1.33;
        let mode = 'smart';

        if (activePreset === 'extreme') {
            quality = 0.45;
            scale = 0.95;
            mode = 'smart';
        } else if (activePreset === 'recommended') {
            quality = 0.65;
            scale = 1.33;
            mode = 'smart';
        } else if (activePreset === 'high') {
            quality = 0.82;
            scale = 1.75;
            mode = 'smart';
        } else {
            // Custom
            const qSlider = document.getElementById('compress-quality');
            if (qSlider) quality = parseFloat(qSlider.value) || 0.65;
            const dpiSelect = document.getElementById('compress-dpi');
            if (dpiSelect) scale = parseFloat(dpiSelect.value) || 1.33;
            const modeSelect = document.getElementById('compress-mode');
            if (modeSelect) mode = modeSelect.value || 'smart';
        }

        const fileData = await file.arrayBuffer();
        let finalPdfBytes = null;

        if (mode === 'lossless') {
            // Lossless structural object-stream optimization
            setStatus(toolId, 'loading', '⏳ Optimizing streams and PDF cross-reference objects...');
            setProgress(toolId, 50);
            const pdfDoc = await PDFLib.PDFDocument.load(fileData.slice(0), { ignoreEncryption: true });
            finalPdfBytes = await pdfDoc.save({ useObjectStreams: true });
        } else {
            // Smart Visual Image Downsampling & JPEG Compression
            if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
            }

            const pdf = await pdfjsLib.getDocument({ data: fileData.slice(0) }).promise;
            const totalPages = pdf.numPages;

            if (totalPages === 0) {
                throw new Error('The PDF document contains no readable pages.');
            }

            const newDoc = await PDFLib.PDFDocument.create();

            for (let i = 1; i <= totalPages; i++) {
                await yieldToMain();
                const pct = Math.round(10 + (i / totalPages) * 78);
                setProgress(toolId, pct);
                setStatus(toolId, 'loading', `⏳ Compressing page ${i} of ${totalPages} (${Math.round((i / totalPages) * 100)}%)...`);

                const page = await pdf.getPage(i);
                const origViewport = page.getViewport({ scale: 1.0 });
                const renderViewport = page.getViewport({ scale: scale });

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.floor(renderViewport.width));
                canvas.height = Math.max(1, Math.floor(renderViewport.height));
                const ctx = canvas.getContext('2d', { alpha: false });

                // Fill white background to prevent transparent page turning black in JPEG
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

                // Compress canvas frame to optimized JPEG blob
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
                const imgBuffer = await blob.arrayBuffer();

                // Embed into new PDF preserving original page dimensions
                const embeddedImg = await newDoc.embedJpg(imgBuffer);
                const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
                newPage.drawImage(embeddedImg, {
                    x: 0,
                    y: 0,
                    width: origViewport.width,
                    height: origViewport.height
                });

                // Clear canvas memory to avoid memory strain in mobile WebView
                canvas.width = 0;
                canvas.height = 0;
            }

            setStatus(toolId, 'loading', '⏳ Finalizing compressed PDF...');
            setProgress(toolId, 92);
            finalPdfBytes = await newDoc.save({ useObjectStreams: true });

            // If the raster output is larger than original (e.g. for a tiny 2KB invoice PDF),
            // test lossless stream compression or fallback so we never bloat the file!
            if (finalPdfBytes.byteLength >= originalSize) {
                try {
                    const fallbackDoc = await PDFLib.PDFDocument.load(fileData.slice(0), { ignoreEncryption: true });
                    const fallbackBytes = await fallbackDoc.save({ useObjectStreams: true });
                    if (fallbackBytes.byteLength < finalPdfBytes.byteLength) {
                        finalPdfBytes = fallbackBytes;
                    }
                } catch (_) {
                    // Fallback to raster version if load fails
                }
            }
        }

        setProgress(toolId, 100);

        const newSize = finalPdfBytes.byteLength;
        const originalName = file.name.replace(/\.pdf$/i, '');
        lastCompressedPdfName = `${originalName}-compressed.pdf`;
        lastCompressedPdfData = finalPdfBytes;

        // Auto trigger download
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(finalPdfBytes, lastCompressedPdfName, 'application/pdf');

        // Calculate savings
        const diff = originalSize - newSize;
        const savingsPct = originalSize > 0 ? Math.round((diff / originalSize) * 100) : 0;

        // Show completed result box
        const origSizeEl = document.getElementById('compress-orig-size');
        const newSizeEl = document.getElementById('compress-new-size');
        const savingsBadge = document.getElementById('compress-savings-badge');
        const savingsPctEl = document.getElementById('compress-savings-pct');

        if (origSizeEl) origSizeEl.innerText = formatBytes(originalSize);
        if (newSizeEl) newSizeEl.innerText = formatBytes(newSize);

        if (savingsPct > 0) {
            if (savingsPctEl) savingsPctEl.innerText = `-${savingsPct}% Saved`;
            if (savingsBadge) {
                savingsBadge.style.background = 'rgba(45, 106, 79, 0.14)';
                savingsBadge.style.color = 'var(--success, #2D6A4F)';
            }
            setStatus(toolId, 'success', `✅ PDF Compressed! Saved ${savingsPct}% (${formatBytes(originalSize)} → ${formatBytes(newSize)})`);
        } else {
            if (savingsPctEl) savingsPctEl.innerText = 'Optimized';
            if (savingsBadge) {
                savingsBadge.style.background = 'rgba(200, 75, 49, 0.14)';
                savingsBadge.style.color = 'var(--accent, #C84B31)';
            }
            setStatus(toolId, 'success', `✅ PDF Processed! File is at optimal size (${formatBytes(newSize)})`);
        }

        if (resultBox) resultBox.style.display = 'block';
        playSound('success');

    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Compress failed: ' + e.message, source: 'processCompress', stack: e.stack });
        setStatus(toolId, 'error', '❌ Compression failed: ' + e.message);
        playSound('error');
    }
}

function downloadLastCompressedPdf() {
    if (lastCompressedPdfData) {
        downloadFile(lastCompressedPdfData, lastCompressedPdfName, 'application/pdf');
    }
}

function resetCompressTool() {
    const resultBox = document.getElementById('compress-result-box');
    if (resultBox) resultBox.style.display = 'none';
    const status = document.getElementById('compress-status');
    if (status) { status.innerText = ''; status.className = 'status'; }
    const prog = document.getElementById('compress-prog');
    if (prog) prog.style.display = 'none';
    const input = document.getElementById('compress-input');
    if (input) input.click();
}

async function processGrayscale() {
    const toolId = 'grayscale';
    if (!checkCdnDependencies(['pdfjsLib', 'PDFLib'], toolId)) return;
    if (!files.grayscale) return;

    try {
        setStatus(toolId, 'loading', '⏳ Converting PDF pages to grayscale...');
        setProgress(toolId, 20);

        const fileData = await files.grayscale.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
        const newDoc = await PDFLib.PDFDocument.create();

        for (let i = 1; i <= pdf.numPages; i++) {
            await yieldToMain();
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            await page.render({ canvasContext: ctx, viewport }).promise;

            // Convert canvas pixels to grayscale
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            for (let j = 0; j < d.length; j += 4) {
                const gray = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
                d[j] = gray;
                d[j + 1] = gray;
                d[j + 2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);

            const grayBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
            const embedded = await newDoc.embedJpg(await grayBlob.arrayBuffer());
            const newPage = newDoc.addPage([viewport.width, viewport.height]);
            newPage.drawImage(embedded, { x: 0, y: 0, width: viewport.width, height: viewport.height });

            setProgress(toolId, 20 + Math.round((i / pdf.numPages) * 70));
        }

        const pdfBytes = await newDoc.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Grayscale.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✅ Grayscale conversion complete!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Grayscale failed: ' + e.message, source: 'processGrayscale', stack: e.stack });
        setStatus(toolId, 'error', '❌ Conversion failed: ' + e.message);
        playSound('error');
    }
}

async function processRotate() {
    const toolId = 'rotate';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.rotate) return;

    try {
        setStatus(toolId, 'loading', '⏳ Rotating PDF pages...');
        setProgress(toolId, 30);

        const angle = parseInt(document.getElementById('rotate-angle').value) || 90;
        const fileData = await files.rotate.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData);

        const pages = pdf.getPages();
        for (const page of pages) {
            await yieldToMain();
            const currentRotation = page.getRotation().angle;
            page.setRotation(PDFLib.degrees(currentRotation + angle));
        }

        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Rotated.pdf', 'application/pdf');
        setStatus(toolId, 'success', `✅ All pages rotated by ${angle}°!`);
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Rotate failed: ' + e.message, source: 'processRotate', stack: e.stack });
        setStatus(toolId, 'error', '❌ Rotation failed: ' + e.message);
        playSound('error');
    }
}

async function processRotatePages() {
    const toolId = 'rotate-pages';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files['rotate-pages']) return;

    const rangeInput = document.getElementById('rotate-pages-range').value;
    if (!rangeInput) {
        setStatus(toolId, 'error', '⚠️ Please select at least one page to rotate.');
        return;
    }

    try {
        setStatus(toolId, 'loading', '⏳ Rotating selected pages...');
        setProgress(toolId, 30);

        const angle = parseInt(document.getElementById('rotate-pages-angle').value) || 90;
        const fileData = await files['rotate-pages'].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData, { ignoreEncryption: true });
        const pages = pdf.getPages();

        const targetPages = (typeof parsePageRanges === 'function' 
            ? parsePageRanges(rangeInput, pages.length) 
            : rangeInput.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))
            .map(p => p - 1);

        for (const pIdx of targetPages) {
            await yieldToMain();
            if (pages[pIdx]) {
                const current = pages[pIdx].getRotation().angle;
                pages[pIdx].setRotation(PDFLib.degrees(current + angle));
            }
        }

        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Custom-Rotated.pdf', 'application/pdf');
        setStatus(toolId, 'success', `✅ Selected pages rotated by ${angle}°!`);
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'RotatePages failed: ' + e.message, source: 'processRotatePages', stack: e.stack });
        setStatus(toolId, 'error', '❌ Rotation failed: ' + e.message);
        playSound('error');
    }
}

async function applyCropPreset() {
    const preset = document.getElementById('crop-preset')?.value || '';
    const topEl = document.getElementById('crop-top');
    const bottomEl = document.getElementById('crop-bottom');
    const leftEl = document.getElementById('crop-left');
    const rightEl = document.getElementById('crop-right');
    if (!topEl || !bottomEl || !leftEl || !rightEl) return;

    let pageW = 595;
    let pageH = 842;

    if (files.crop && typeof PDFLib !== 'undefined') {
        try {
            const buf = await files.crop.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
            const firstPage = pdf.getPages()[0];
            if (firstPage) {
                const sz = firstPage.getSize();
                pageW = sz.width;
                pageH = sz.height;
            }
        } catch (_) {}
    }

    if (preset === 'meesho' || preset === 'meesho_flipkart') {
        // Isolate top 50% of page (width: 100%, height: top 50%)
        topEl.value = 0;
        bottomEl.value = Math.round(pageH * 0.5);
        leftEl.value = 0;
        rightEl.value = 0;
    } else if (preset === 'amazon' || preset === 'amazon_4x6') {
        // 4x6 inch ratio (2:3) based on page dimensions
        const targetRatio = 4 / 6;
        let cropW = pageW;
        let cropH = Math.round(cropW / targetRatio);
        if (cropH > pageH) {
            cropH = pageH;
            cropW = Math.round(cropH * targetRatio);
        }
        // If standard A4 sheet with 4x6 thermal label (288x432 pt), isolate the 4x6 label box
        if (pageW >= 400 && pageH >= 600) {
            cropW = Math.min(pageW, Math.max(288, Math.round(pageW * 0.484)));
            cropH = Math.min(pageH, Math.round(cropW / targetRatio));
        }
        const horizMargin = Math.max(0, Math.round((pageW - cropW) / 2));
        topEl.value = 0;
        bottomEl.value = Math.max(0, Math.round(pageH - cropH));
        leftEl.value = horizMargin;
        rightEl.value = horizMargin;
    } else if (preset === 'A4') {
        topEl.value = 20;
        bottomEl.value = 20;
        leftEl.value = 20;
        rightEl.value = 20;
    } else if (preset === 'Letter') {
        topEl.value = 25;
        bottomEl.value = 25;
        leftEl.value = 25;
        rightEl.value = 25;
    } else if (preset === 'A5') {
        topEl.value = 15;
        bottomEl.value = 15;
        leftEl.value = 15;
        rightEl.value = 15;
    } else if (preset === '') {
        topEl.value = 0;
        bottomEl.value = 0;
        leftEl.value = 0;
        rightEl.value = 0;
    }
}

async function processCrop() {
    const toolId = 'crop';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.crop) return;

    try {
        setStatus(toolId, 'loading', '⏳ Cropping PDF pages...');
        setProgress(toolId, 30);

        const preset = document.getElementById('crop-preset')?.value || '';
        const top = parseFloat(document.getElementById('crop-top').value) || 0;
        const bottom = parseFloat(document.getElementById('crop-bottom').value) || 0;
        const left = parseFloat(document.getElementById('crop-left').value) || 0;
        const right = parseFloat(document.getElementById('crop-right').value) || 0;

        const fileData = await files.crop.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData);
        const pages = pdf.getPages();

        for (const page of pages) {
            await yieldToMain();
            const { width, height } = page.getSize();
            if (preset === 'meesho' || preset === 'meesho_flipkart') {
                // Automatically crop the top 50% of an A4 page (width: 100%, height: top 50%)
                const newW = Math.max(10, width);
                const newH = Math.max(10, Math.round(height * 0.5));
                const cropY = Math.max(0, height - newH);
                page.setCropBox(0, cropY, newW, newH);
                page.setMediaBox(0, cropY, newW, newH);
            } else if (preset === 'amazon' || preset === 'amazon_4x6') {
                // Set crop box to standard 4x6 inch ratio (2:3) dimensions based on the PDF page size
                const targetRatio = 4 / 6;
                let cropW = width;
                let cropH = Math.round(cropW / targetRatio);
                if (cropH > height) {
                    cropH = height;
                    cropW = Math.round(cropH * targetRatio);
                }
                if (width >= 400 && height >= 600) {
                    cropW = Math.min(width, Math.max(288, Math.round(width * 0.484)));
                    cropH = Math.min(height, Math.round(cropW / targetRatio));
                }
                const cropX = Math.max(0, Math.round((width - cropW) / 2));
                const cropY = Math.max(0, height - cropH);
                page.setCropBox(cropX, cropY, Math.max(10, cropW), Math.max(10, cropH));
                page.setMediaBox(cropX, cropY, Math.max(10, cropW), Math.max(10, cropH));
            } else {
                const newW = Math.max(10, width - left - right);
                const newH = Math.max(10, height - bottom - top);
                page.setCropBox(left, bottom, newW, newH);
                page.setMediaBox(left, bottom, newW, newH);
            }
        }

        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Cropped.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✅ Pages cropped successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Crop failed: ' + e.message, source: 'processCrop', stack: e.stack });
        setStatus(toolId, 'error', '❌ Crop failed: ' + e.message);
        playSound('error');
    }
}

async function processWatermark() {
    const toolId = 'watermark';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.watermark) return;

    try {
        setStatus(toolId, 'loading', '⏳ Adding watermark...');
        setProgress(toolId, 30);

        const pos = document.getElementById('wm-pos').value;
        const rot = parseFloat(document.getElementById('wm-rot').value) || 0;
        const text = document.getElementById('wm-text').value.trim();
        const fontName = document.getElementById('wm-font').value;
        const imgInput = document.getElementById('wm-img');

        const fileData = await files.watermark.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData);
        const pages = pdf.getPages();
        const font = await pdf.embedFont(PDFLib.StandardFonts[fontName] || PDFLib.StandardFonts.Helvetica);

        let wmImage = null;
        if (imgInput.files && imgInput.files.length > 0) {
            const imgData = await imgInput.files[0].arrayBuffer();
            if (imgInput.files[0].type === 'image/png') {
                wmImage = await pdf.embedPng(imgData);
            } else {
                wmImage = await pdf.embedJpg(imgData);
            }
        }

        for (const page of pages) {
            await yieldToMain();
            const { width, height } = page.getSize();
            let x = width / 2;
            let y = height / 2;

            if (pos === 'top-left') { x = width * 0.2; y = height * 0.85; }
            else if (pos === 'top-right') { x = width * 0.8; y = height * 0.85; }
            else if (pos === 'bottom-left') { x = width * 0.2; y = height * 0.15; }
            else if (pos === 'bottom-right') { x = width * 0.8; y = height * 0.15; }

            if (text) {
                const textSize = 32;
                page.drawText(text, {
                    x: x - (text.length * textSize) / 4,
                    y: y,
                    size: textSize,
                    font: font,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                    opacity: 0.35,
                    rotate: PDFLib.degrees(rot)
                });
            }

            if (wmImage) {
                const dims = wmImage.scale(0.3);
                page.drawImage(wmImage, {
                    x: x - dims.width / 2,
                    y: y - dims.height / 2,
                    width: dims.width,
                    height: dims.height,
                    opacity: 0.35,
                    rotate: PDFLib.degrees(rot)
                });
            }
        }

        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Watermarked.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✅ Watermark applied successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Watermark failed: ' + e.message, source: 'processWatermark', stack: e.stack });
        setStatus(toolId, 'error', '❌ Watermarking failed: ' + e.message);
        playSound('error');
    }
}

async function processExtract() {
    const toolId = 'extract';
    if (!checkCdnDependencies(['pdfjsLib'], toolId)) return;
    if (!files.extract) return;

    try {
        setStatus(toolId, 'loading', '⏳ Extracting text content...');
        setProgress(toolId, 25);

        const fileData = await files.extract.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            await yieldToMain();
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += `--- Page ${i} ---\n` + pageText + '\n\n';
            setProgress(toolId, 25 + Math.round((i / pdf.numPages) * 70));
        }

        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(fullText, '1010Tool-Extracted-Text.txt', 'text/plain');
        setStatus(toolId, 'success', `✅ Extracted text from ${pdf.numPages} pages!`);
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Extract failed: ' + e.message, source: 'processExtract', stack: e.stack });
        setStatus(toolId, 'error', '❌ Text extraction failed: ' + e.message);
        playSound('error');
    }
}

async function processLock() {
    const toolId = 'lock';
    if (!checkCdnDependencies(['PDFLib', 'PDFEncryptLite'], toolId)) return;
    if (!files.lock) {
        setStatus(toolId, 'error', '⚠️ Please select a PDF file first.');
        return;
    }

    const pass = (document.getElementById('lock-pass')?.value || '').trim();
    if (!pass) {
        setStatus(toolId, 'error', '⚠️ Please enter a password.');
        return;
    }

    try {
        setStatus(toolId, 'loading', '⏳ Encrypting PDF with password...');
        setProgress(toolId, 20);
        await yieldToMain();
        const fileData = await files.lock.arrayBuffer();
        
        // Validate input PDF structure
        const pdf = await PDFLib.PDFDocument.load(fileData, { ignoreEncryption: true });
        setProgress(toolId, 50);

        await yieldToMain();
        const pdfBytes = await pdf.save({ useObjectStreams: false, updateFieldAppearances: false });
        setProgress(toolId, 75);

        // Real standard PDF encryption
        if (!window.PDFEncryptLite || typeof window.PDFEncryptLite.encryptPDF !== 'function') {
            throw new Error('PDF encryption engine is not loaded.');
        }

        await yieldToMain();
        const protectedBytes = await window.PDFEncryptLite.encryptPDF(pdfBytes, pass);
        setProgress(toolId, 100);

        const originalName = files.lock.name ? files.lock.name.replace(/\.[^/.]+$/, '') : 'document';
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(protectedBytes, `${originalName}-protected.pdf`, 'application/pdf');
        setStatus(toolId, 'success', '🔒 PDF encrypted and protected successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Lock failed: ' + e.message, source: 'processLock', stack: e.stack });
        setStatus(toolId, 'error', '❌ Protection failed: ' + e.message);
        playSound('error');
    }
}

async function processUnlock() {
    const toolId = 'unlock';
    if (!checkCdnDependencies(['PDFLib', 'PDFDecrypt'], toolId)) return;
    if (!files.unlock) {
        setStatus(toolId, 'error', '⚠️ Please select a PDF file first.');
        return;
    }

    const pass = (document.getElementById('unlock-pass')?.value || '').trim();
    if (!pass) {
        setStatus(toolId, 'error', '⚠️ Please enter the password.');
        return;
    }

    try {
        setStatus(toolId, 'loading', '⏳ Decrypting and unlocking PDF...');
        setProgress(toolId, 25);
        await yieldToMain();
        const fileData = await files.unlock.arrayBuffer();
        const rawBytes = new Uint8Array(fileData);

        if (!window.PDFDecrypt || typeof window.PDFDecrypt.decryptPDF !== 'function') {
            throw new Error('PDF decryption engine is not loaded.');
        }

        setProgress(toolId, 60);
        await yieldToMain();
        const decryptedBytes = await window.PDFDecrypt.decryptPDF(rawBytes, pass);
        setProgress(toolId, 95);

        const originalName = files.unlock.name ? files.unlock.name.replace(/\.[^/.]+$/, '') : 'document';
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(decryptedBytes, `${originalName}-unlocked.pdf`, 'application/pdf');
        setProgress(toolId, 100);
        setStatus(toolId, 'success', '🔓 PDF unlocked and decrypted successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Unlock failed: ' + e.message, source: 'processUnlock', stack: e.stack });
        const errMsg = (e.message && e.message.toLowerCase().includes('password'))
            ? '❌ Incorrect password. Please verify and try again.'
            : '❌ Unlock failed: ' + (e.message || 'Corrupted or unsupported PDF file.');
        setStatus(toolId, 'error', errMsg);
        playSound('error');
    }
}

async function processRemove() {
    const toolId = 'remove';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.remove) return;

    const selectedPages = document.getElementById('remove-pages').value;
    if (!selectedPages) {
        setStatus(toolId, 'error', '⚠️ Please select pages to remove.');
        return;
    }

    try {
        setStatus(toolId, 'loading', '⏳ Removing selected pages...');
        const indicesToRemove = selectedPages.split(',').map(n => parseInt(n.trim()) - 1).sort((a, b) => b - a);

        const fileData = await files.remove.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData, { ignoreEncryption: true });

        const totalPages = pdf.getPageCount();
        const validIndicesToRemove = indicesToRemove.filter(idx => idx >= 0 && idx < totalPages);
        if (validIndicesToRemove.length >= totalPages) {
            setStatus(toolId, 'error', '⚠️ A PDF must retain at least one page. You cannot remove all pages.');
            return;
        }

        for (const idx of validIndicesToRemove) {
            await yieldToMain();
            pdf.removePage(idx);
        }

        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Pages-Removed.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✅ Selected pages removed successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Remove failed: ' + e.message, source: 'processRemove', stack: e.stack });
        setStatus(toolId, 'error', '❌ Removal failed: ' + e.message);
        playSound('error');
    }
}

async function processNumbering() {
    const toolId = 'numbering';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.numbering) return;

    try {
        setStatus(toolId, 'loading', '⏳ Adding page numbers...');
        const pos = document.getElementById('numbering-pos').value;
        const fileData = await files.numbering.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData);
        const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);

        const pages = pdf.getPages();
        const total = pages.length;

        for (let idx = 0; idx < pages.length; idx++) {
            await yieldToMain();
            const page = pages[idx];
            const { width, height } = page.getSize();
            const text = `Page ${idx + 1} of ${total}`;
            const textSize = 10;
            let x = width / 2 - 30;
            let y = 25;

            if (pos === 'bottom-right') { x = width - 90; y = 25; }
            else if (pos === 'top-center') { x = width / 2 - 30; y = height - 30; }

            page.drawText(text, {
                x,
                y,
                size: textSize,
                font: font,
                color: PDFLib.rgb(0.2, 0.2, 0.2)
            });
        }

        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Numbered.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✅ Page numbers added successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Numbering failed: ' + e.message, source: 'processNumbering', stack: e.stack });
        setStatus(toolId, 'error', '❌ Numbering failed: ' + e.message);
        playSound('error');
    }
}

async function processMetadata() {
    const toolId = 'metadata';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.metadata) return;

    try {
        setStatus(toolId, 'loading', '⏳ Updating metadata...');
        await yieldToMain();
        const title = (document.getElementById('meta-title')?.value || '').trim();
        const author = (document.getElementById('meta-author')?.value || '').trim();
        const creator = (document.getElementById('meta-creator')?.value || '').trim();

        const fileData = await files.metadata.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData, { ignoreEncryption: true });

        pdf.setTitle(title);
        pdf.setAuthor(author);
        pdf.setCreator(creator);
        pdf.setProducer('1010Tool (https://1010tool.com)');
        pdf.setModificationDate(new Date());

        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Updated-Metadata.pdf', 'application/pdf');
        setStatus(toolId, 'success', '🏷️ Metadata updated successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Metadata failed: ' + e.message, source: 'processMetadata', stack: e.stack });
        setStatus(toolId, 'error', '❌ Metadata update failed: ' + e.message);
        playSound('error');
    }
}

async function processSign() {
    const toolId = 'sign';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.sign || !files.signImg) {
        setStatus(toolId, 'error', '⚠️ Please upload both the PDF and your signature image.');
        return;
    }

    try {
        setStatus(toolId, 'loading', '⏳ Embedding signature on PDF...');
        await yieldToMain();
        const pdfData = await files.sign.arrayBuffer();
        const imgData = await files.signImg.arrayBuffer();

        const pdf = await PDFLib.PDFDocument.load(pdfData);
        let sigImg;
        if (files.signImg.type === 'image/png') {
            sigImg = await pdf.embedPng(imgData);
        } else {
            sigImg = await pdf.embedJpg(imgData);
        }

        const pages = pdf.getPages();
        const lastPage = pages[pages.length - 1];
        const dims = sigImg.scale(0.35);

        // Place on bottom right of the final page
        lastPage.drawImage(sigImg, {
            x: lastPage.getWidth() - dims.width - 50,
            y: 50,
            width: dims.width,
            height: dims.height
        });

        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Signed.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✍️ Document signed successfully!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Sign failed: ' + e.message, source: 'processSign', stack: e.stack });
        setStatus(toolId, 'error', '❌ Signing failed: ' + e.message);
        playSound('error');
    }
}

async function processReverse() {
    const toolId = 'reverse';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.reverse) return;

    try {
        setStatus(toolId, 'loading', '⏳ Reversing page order...');
        await yieldToMain();
        const fileData = await files.reverse.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData);
        const reversedDoc = await PDFLib.PDFDocument.create();

        const total = pdf.getPageCount();
        const indices = [];
        for (let i = total - 1; i >= 0; i--) indices.push(i);

        const copied = await reversedDoc.copyPages(pdf, indices);
        copied.forEach(p => reversedDoc.addPage(p));

        const pdfBytes = await reversedDoc.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Reversed.pdf', 'application/pdf');
        setStatus(toolId, 'success', '✅ Page order reversed!');
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Reverse failed: ' + e.message, source: 'processReverse', stack: e.stack });
        setStatus(toolId, 'error', '❌ Reversal failed: ' + e.message);
        playSound('error');
    }
}

async function processFlatten() {
    const toolId = 'flatten';
    if (!checkCdnDependencies(['PDFLib'], toolId)) return;
    if (!files.flatten) return;

    try {
        setStatus(toolId, 'loading', '⏳ Flattening interactive forms...');
        setProgress(toolId, 30);
        await yieldToMain();
        const fileData = await files.flatten.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileData, { ignoreEncryption: true });

        let hadForm = false;
        try {
            const form = pdf.getForm();
            if (form) {
                form.flatten();
                hadForm = true;
            }
        } catch (_) {
            hadForm = false;
        }

        setProgress(toolId, 80);
        await yieldToMain();
        const pdfBytes = await pdf.save();
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(pdfBytes, '1010Tool-Flattened.pdf', 'application/pdf');
        setProgress(toolId, 100);
        if (hadForm) {
            setStatus(toolId, 'success', '📄 Interactive forms flattened into static pages successfully!');
        } else {
            setStatus(toolId, 'success', '📄 Document static structure verified (no interactive forms detected).');
        }
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Flatten failed: ' + e.message, source: 'processFlatten', stack: e.stack });
        setStatus(toolId, 'error', '❌ Flattening failed: ' + e.message);
        playSound('error');
    }
}

async function processBatchPdf() {
    const toolId = 'batchpdf';
    if (!checkCdnDependencies(['PDFLib', 'JSZip'], toolId)) return;
    if (!files.batchpdf || files.batchpdf.length === 0) return;

    try {
        setStatus(toolId, 'loading', '⏳ Batch processing files...');
        setProgress(toolId, 10);

        const doCompress = document.getElementById('batchpdf-action-compress').checked;
        const doRotate = document.getElementById('batchpdf-action-rotate').checked;
        const rotateAngle = parseInt(document.getElementById('batchpdf-rotate-angle').value) || 90;
        const doWatermark = document.getElementById('batchpdf-action-watermark').checked;
        const watermarkText = document.getElementById('batchpdf-watermark-text').value.trim();

        const zip = new JSZip();

        for (let i = 0; i < files.batchpdf.length; i++) {
            await yieldToMain();
            const file = files.batchpdf[i];
            const fileData = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(fileData);

            if (doRotate) {
                pdf.getPages().forEach(p => {
                    p.setRotation(PDFLib.degrees(p.getRotation().angle + rotateAngle));
                });
            }

            if (doWatermark && watermarkText) {
                const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
                pdf.getPages().forEach(p => {
                    const { width, height } = p.getSize();
                    p.drawText(watermarkText, {
                        x: width / 2 - 50,
                        y: height / 2,
                        size: 30,
                        font: font,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.3
                    });
                });
            }

            const pdfBytes = await pdf.save({ useObjectStreams: doCompress });
            zip.file(`1010Tool-${file.name}`, pdfBytes);
            setProgress(toolId, 10 + Math.round(((i + 1) / files.batchpdf.length) * 80));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(zipBlob, '1010Tool-Batch-Processed.zip', 'application/zip');
        setStatus(toolId, 'success', `✅ Batch processed ${files.batchpdf.length} files successfully!`);
        playSound('success');
    } catch (e) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'BatchPdf failed: ' + e.message, source: 'processBatchPdf', stack: e.stack });
        setStatus(toolId, 'error', '❌ Batch processing failed: ' + e.message);
        playSound('error');
    }
}

async function processRename() {
    const toolId = 'rename';
    if (!files.rename || files.rename.length === 0) return;

    try {
        setStatus(toolId, 'loading', '⏳ Renaming files...');
        const base = document.getElementById('rename-base').value || 'document_';
        const suffixType = document.getElementById('rename-suffix').value;

        const zip = new JSZip();
        for (let i = 0; i < files.rename.length; i++) {
            await yieldToMain();
            const file = files.rename[i];
            const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
            let newName = '';

            if (suffixType === 'counter') {
                newName = `${base}${i + 1}${ext}`;
            } else {
                newName = `${base}${Date.now()}_${i + 1}${ext}`;
            }

            zip.file(newName, await file.arrayBuffer());
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        downloadFile(zipBlob, '1010Tool-Renamed-Files.zip', 'application/zip');
        setStatus(toolId, 'success', `✏️ Renamed ${files.rename.length} files successfully!`);
        playSound('success');
    } catch (e) {
        setStatus(toolId, 'error', '❌ Rename failed: ' + e.message);
        playSound('error');
    }
}

// ==========================================
// 2. IMAGE TOOLS & PNG SUITE
// ==========================================

let imgCompressSourceImg = null;
let imgCompressSourceFile = null;
let imgCompressPreviewCtx = null;
let imgCompressWorkCanvas = null;
let imgCompressWorkCtx = null;
let imgCompressDecodedImg = null;
let imgCompressActiveBlobUrl = null;
let imgCompressDebounceTimer = null;
let imgCompressRenderSeq = 0;

function revokeImgCompressBlobUrl() {
    if (imgCompressActiveBlobUrl) {
        try {
            URL.revokeObjectURL(imgCompressActiveBlobUrl);
        } catch (_) {}
        imgCompressActiveBlobUrl = null;
    }
}

function bindImgCompressPreviewListeners() {
    const qualitySlider = document.getElementById('imgcompress-quality');
    const formatSelect = document.getElementById('imgcompress-format');
    const targetKbInput = document.getElementById('imgcompress-target-kb');

    if (qualitySlider && qualitySlider.dataset.boundLivePreview !== 'true') {
        qualitySlider.dataset.boundLivePreview = 'true';
        qualitySlider.addEventListener('input', function() {
            const valLabel = document.getElementById('imgcompress-quality-val');
            if (valLabel) valLabel.innerText = Math.round(parseFloat(this.value || 0.7) * 100) + '%';
            updateImgCompressLivePreview(false);
        });
    }

    if (formatSelect && formatSelect.dataset.boundLivePreview !== 'true') {
        formatSelect.dataset.boundLivePreview = 'true';
        formatSelect.addEventListener('change', function() {
            updateImgCompressLivePreview(false);
        });
    }

    if (targetKbInput && targetKbInput.dataset.boundLivePreview !== 'true') {
        targetKbInput.dataset.boundLivePreview = 'true';
        targetKbInput.addEventListener('input', function() {
            updateImgCompressLivePreview(false);
        });
    }
}

async function initImgCompressLivePreview() {
    bindImgCompressPreviewListeners();
    const wrap = document.getElementById('imgcompress-preview-wrap');
    const canvas = document.getElementById('imgcompress-preview-canvas');
    const emptyState = document.getElementById('imgcompress-empty-state');
    const origBadge = document.getElementById('imgcompress-orig-size-badge');
    const estBadge = document.getElementById('imgcompress-est-size-badge');
    const list = files.imgcompress;

    if (!list || list.length === 0) {
        if (canvas) canvas.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (origBadge) origBadge.innerText = 'Original: --';
        if (estBadge) estBadge.innerText = 'Estimated Output Size: --';
        imgCompressSourceImg = null;
        imgCompressSourceFile = null;
        if (imgCompressDebounceTimer) {
            clearTimeout(imgCompressDebounceTimer);
            imgCompressDebounceTimer = null;
        }
        revokeImgCompressBlobUrl();
        return;
    }

    const activeFile = list[list.length - 1];
    try {
        const loadedImg = await loadImageFromFile(activeFile);
        imgCompressSourceFile = activeFile;
        imgCompressSourceImg = loadedImg;

        if (wrap) wrap.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (canvas) canvas.style.display = 'inline-block';
        if (origBadge) {
            origBadge.innerText = `Original: ${formatBytes(activeFile.size)} (${loadedImg.width}×${loadedImg.height})`;
        }

        updateImgCompressLivePreview(true);
    } catch (err) {
        console.warn('Could not initialize image compressor live preview:', err);
    }
}
window.initImgCompressLivePreview = initImgCompressLivePreview;

// Shared smart compression helper:
// Strictly preserves the selected format from #imgcompress-format.
// If targetBytes > 0, iteratively reduces quality from 0.9 down to 0.1,
// and if still above targetBytes at 0.1 quality, scales canvas dimensions down by 10% iteratively.
async function smartCompressImageToBlob(img, canvas, ctx, selectedFormat, quality, targetBytes) {
    const format = selectedFormat;

    if (targetBytes > 0) {
        let scale = 1.0;
        let lastBlob = null;
        const qualitySteps = format === 'image/png' ? [1] : [9, 8, 7, 6, 5, 4, 3, 2, 1];

        while (scale >= 0.1) {
            await yieldToMain();
            const curW = Math.max(16, Math.round(img.width * scale));
            const curH = Math.max(16, Math.round(img.height * scale));
            if (canvas.width !== curW || canvas.height !== curH) {
                canvas.width = curW;
                canvas.height = curH;
            }
            ctx.clearRect(0, 0, curW, curH);
            if (format === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, curW, curH);
            }
            ctx.drawImage(img, 0, 0, curW, curH);

            for (const qStep of qualitySteps) {
                await yieldToMain();
                const q = qStep / 10; // 0.9 down to 0.1
                const testBlob = await new Promise(r => canvas.toBlob(r, format, q));
                if (testBlob) {
                    lastBlob = testBlob;
                    if (testBlob.size <= targetBytes) {
                        return { blob: testBlob, format };
                    }
                }
            }

            // Still above targetBytes at 0.1 quality -> scale down dimensions by 10%
            scale = Math.round(scale * 0.9 * 1000) / 1000;
            if (curW <= 16 && curH <= 16) break;
        }

        return { blob: lastBlob, format };
    }

    if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise(r => canvas.toBlob(r, format, quality));
    return { blob, format };
}

function updateImgCompressLivePreview(immediate = false) {
    if (!imgCompressSourceImg || !imgCompressSourceFile) return;

    const canvas = document.getElementById('imgcompress-preview-canvas');
    if (!canvas) return;

    if (!imgCompressPreviewCtx) {
        imgCompressPreviewCtx = canvas.getContext('2d');
    }

    const srcW = imgCompressSourceImg.width;
    const srcH = imgCompressSourceImg.height;
    if (canvas.width !== srcW || canvas.height !== srcH) {
        canvas.width = srcW;
        canvas.height = srcH;
    }

    const selectedFormat = document.getElementById('imgcompress-format')?.value || 'image/jpeg';
    const quality = parseFloat(document.getElementById('imgcompress-quality')?.value) || 0.7;
    const targetKB = parseFloat(document.getElementById('imgcompress-target-kb')?.value) || 0;
    const targetBytes = targetKB > 0 ? targetKB * 1024 : 0;

    // Immediately render base preview frame so user gets zero-latency visual feedback
    imgCompressPreviewCtx.clearRect(0, 0, srcW, srcH);
    if (selectedFormat === 'image/jpeg') {
        imgCompressPreviewCtx.fillStyle = '#FFFFFF';
        imgCompressPreviewCtx.fillRect(0, 0, srcW, srcH);
    }
    imgCompressPreviewCtx.drawImage(imgCompressSourceImg, 0, 0, srcW, srcH);

    const estBadge = document.getElementById('imgcompress-est-size-badge');
    if (estBadge && !immediate) {
        estBadge.innerText = 'Estimated Output Size: Calculating...';
    }

    if (imgCompressDebounceTimer) {
        clearTimeout(imgCompressDebounceTimer);
    }

    const seq = ++imgCompressRenderSeq;
    const delay = immediate ? 0 : 200;

    imgCompressDebounceTimer = setTimeout(async () => {
        if (!imgCompressSourceImg || !imgCompressSourceFile || seq !== imgCompressRenderSeq) return;

        if (!imgCompressWorkCanvas) {
            imgCompressWorkCanvas = document.createElement('canvas');
            imgCompressWorkCtx = imgCompressWorkCanvas.getContext('2d');
        }

        const { blob } = await smartCompressImageToBlob(
            imgCompressSourceImg,
            imgCompressWorkCanvas,
            imgCompressWorkCtx,
            selectedFormat,
            quality,
            targetBytes
        );

        if (!blob || seq !== imgCompressRenderSeq) return;

        const origSize = imgCompressSourceFile ? imgCompressSourceFile.size : 0;
        const estBytes = blob.size;
        const diffPct = origSize > 0 ? Math.round((1 - estBytes / origSize) * 100) : 0;
        const savingsTag = diffPct > 0 ? ` (-${diffPct}%)` : (diffPct < 0 ? ` (+${Math.abs(diffPct)}%)` : '');

        if (estBadge) {
            estBadge.innerText = `Estimated Output Size: ${formatBytes(estBytes)}${savingsTag}`;
        }

        // Render actual compressed blob back onto the preview canvas reusing a single Image instance
        if (!imgCompressDecodedImg) {
            imgCompressDecodedImg = new Image();
        }
        revokeImgCompressBlobUrl();
        const objUrl = URL.createObjectURL(blob);
        imgCompressActiveBlobUrl = objUrl;

        imgCompressDecodedImg.onload = () => {
            if (seq === imgCompressRenderSeq && imgCompressPreviewCtx) {
                imgCompressPreviewCtx.clearRect(0, 0, canvas.width, canvas.height);
                if (selectedFormat === 'image/jpeg') {
                    imgCompressPreviewCtx.fillStyle = '#FFFFFF';
                    imgCompressPreviewCtx.fillRect(0, 0, canvas.width, canvas.height);
                }
                imgCompressPreviewCtx.drawImage(imgCompressDecodedImg, 0, 0, canvas.width, canvas.height);
            }
            revokeImgCompressBlobUrl();
        };
        imgCompressDecodedImg.onerror = () => {
            revokeImgCompressBlobUrl();
        };
        imgCompressDecodedImg.src = objUrl;
    }, delay);
}
window.updateImgCompressLivePreview = updateImgCompressLivePreview;

async function processImgCompress() {
    const toolId = 'imgcompress';
    if (!files.imgcompress || files.imgcompress.length === 0) return;

    try {
        setStatus(toolId, 'loading', '⏳ Compressing images...');
        await yieldToMain();
        const format = document.getElementById('imgcompress-format').value;
        const quality = parseFloat(document.getElementById('imgcompress-quality').value) || 0.7;
        const targetKB = parseFloat(document.getElementById('imgcompress-target-kb')?.value) || 0;
        const targetBytes = targetKB > 0 ? targetKB * 1024 : 0;

        // Extract exact extension (.jpg, .png, or .webp) based on selected MIME type
        const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';

        if (!imgCompressWorkCanvas) {
            imgCompressWorkCanvas = document.createElement('canvas');
            imgCompressWorkCtx = imgCompressWorkCanvas.getContext('2d');
        }

        if (files.imgcompress.length === 1) {
            await yieldToMain();
            const file = files.imgcompress[0];
            const img = await loadImageFromFile(file);
            const { blob } = await smartCompressImageToBlob(
                img,
                imgCompressWorkCanvas,
                imgCompressWorkCtx,
                format,
                quality,
                targetBytes
            );

            if (!blob) throw new Error('Failed to generate compressed image blob.');
            if (window.AndroidAds) window.AndroidAds.showInterstitial();
            downloadFile(blob, '1010Tool-Compressed.' + ext, format);
            setStatus(toolId, 'success', targetKB > 0
                ? `🗜️ Compressed image to ≤ ${targetKB} KB (.${ext})!`
                : `🗜️ Compressed image (.${ext})!`);
        } else {
            const zip = new JSZip();

            for (let i = 0; i < files.imgcompress.length; i++) {
                await yieldToMain();
                const file = files.imgcompress[i];
                const img = await loadImageFromFile(file);
                const { blob } = await smartCompressImageToBlob(
                    img,
                    imgCompressWorkCanvas,
                    imgCompressWorkCtx,
                    format,
                    quality,
                    targetBytes
                );

                if (blob) {
                    zip.file(`1010Tool-Compressed-${i + 1}.${ext}`, blob);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            if (window.AndroidAds) window.AndroidAds.showInterstitial();
            downloadFile(zipBlob, '1010Tool-Compressed-Images.zip', 'application/zip');
            setStatus(toolId, 'success', targetKB > 0
                ? `🗜️ Compressed ${files.imgcompress.length} images to ≤ ${targetKB} KB!`
                : `🗜️ Compressed ${files.imgcompress.length} images!`);
        }

        playSound('success');
    } catch (e) {
        setStatus(toolId, 'error', '❌ Image compression failed: ' + e.message);
        playSound('error');
    }
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Cropper.js Integration
let cropperInstance = null;

function handleCropUpload(input) {
    if (!checkCdnDependencies(['Cropper'], 'cropimg')) return;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('cropimg-image');
        img.src = e.target.result;
        document.getElementById('cropimg-editor').style.display = 'block';
        document.getElementById('cropimg-upload-box').style.display = 'none';

        if (cropperInstance) cropperInstance.destroy();
        try {
            cropperInstance = new Cropper(img, {
                aspectRatio: NaN,
                viewMode: 1,
                responsive: true
            });
        } catch (err) {
            errorLogger.record({ type: 'TOOL_ERROR', message: 'Cropper initialization failed: ' + err.message, source: 'handleCropUpload', stack: err.stack });
        }
    };
    reader.readAsDataURL(file);
}

function setCropRatio(ratio) {
    if (cropperInstance) {
        cropperInstance.setAspectRatio(ratio);
    }
}

function resetCrop() {
    if (cropperInstance) {
        cropperInstance.reset();
    }
}

function downloadCropped() {
    if (!cropperInstance) return;
    try {
        showGlobalLoading('Cropping and preparing image...', 'Image Processing');
        cropperInstance.getCroppedCanvas().toBlob(blob => {
            try {
                if (window.AndroidAds) window.AndroidAds.showInterstitial();
                downloadFile(blob, '1010Tool-Cropped-Image.png', 'image/png');
                playSound('success');
            } finally {
                hideGlobalLoading();
            }
        });
    } catch (err) {
        hideGlobalLoading();
        errorLogger.record({ type: 'TOOL_ERROR', message: 'Crop download failed: ' + err.message, source: 'downloadCropped', stack: err.stack });
    }
}

// Resizer Integration
let resizeImgElement = null;
let resizeAspectLocked = true;
let resizeOriginalRatio = 1;

function handleResizeUpload(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById('resize-preview-img');
        preview.src = e.target.result;
        preview.onload = () => {
            document.getElementById('resize-width').value = preview.naturalWidth;
            document.getElementById('resize-height').value = preview.naturalHeight;
            resizeOriginalRatio = preview.naturalWidth / preview.naturalHeight;
            document.getElementById('resize-editor').style.display = 'block';
        };
        resizeImgElement = preview;
    };
    reader.readAsDataURL(file);
}

function toggleResizeLock() {
    resizeAspectLocked = !resizeAspectLocked;
    const lockEl = document.getElementById('resize-lock-icon');
    if (lockEl) {
        lockEl.innerHTML = resizeAspectLocked
            ? '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
            : '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
    }
}

function updateResize(changed) {
    if (!resizeAspectLocked || !resizeOriginalRatio) return;
    const wInput = document.getElementById('resize-width');
    const hInput = document.getElementById('resize-height');

    if (changed === 'width') {
        hInput.value = Math.round(parseFloat(wInput.value) / resizeOriginalRatio) || 1;
    } else {
        wInput.value = Math.round(parseFloat(hInput.value) * resizeOriginalRatio) || 1;
    }
}

function processResize() {
    if (!resizeImgElement) return;
    try {
        showGlobalLoading('Resizing image...', 'Image Processing');
        const width = parseInt(document.getElementById('resize-width').value) || resizeImgElement.naturalWidth;
        const height = parseInt(document.getElementById('resize-height').value) || resizeImgElement.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(resizeImgElement, 0, 0, width, height);

        canvas.toBlob(blob => {
            try {
                if (window.AndroidAds) window.AndroidAds.showInterstitial();
                downloadFile(blob, `1010Tool-Resized-${width}x${height}.png`, 'image/png');
                playSound('success');
            } finally {
                hideGlobalLoading();
            }
        });
    } catch (e) {
        hideGlobalLoading();
        console.error('Resize failed:', e);
    }
}

// Passport Size Maker
let passportCropper = null;
let currentPassportCard = 1;
let passportWidthCm = 3.5;
let passportHeightCm = 4.5;

function handlePassportUpload(input) {
    if (!checkCdnDependencies(['Cropper'], 'passport')) return;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('passport-image');
        img.src = e.target.result;
        document.getElementById('passport-editor').style.display = 'block';
        document.getElementById('passport-upload-box').style.display = 'none';

        if (passportCropper) passportCropper.destroy();
        try {
            passportCropper = new Cropper(img, {
                aspectRatio: passportWidthCm / passportHeightCm,
                viewMode: 1
            });
        } catch (err) {
            errorLogger.record({ type: 'TOOL_ERROR', message: 'Passport cropper failed: ' + err.message, source: 'handlePassportUpload', stack: err.stack });
        }
    };
    reader.readAsDataURL(file);
}

function selectPassportCard(cardNum, w, h) {
    currentPassportCard = cardNum;
    for (let i = 1; i <= 4; i++) {
        const card = document.getElementById(`pcard-${i}`);
        const badge = document.getElementById(`pbadge-${i}`);
        if (card && badge) {
            if (i === cardNum) {
                card.style.border = '2px solid var(--accent)';
                badge.style.display = 'block';
            } else {
                card.style.border = '1px solid var(--border)';
                badge.style.display = 'none';
            }
        }
    }

    if (cardNum !== 4) {
        passportWidthCm = w;
        passportHeightCm = h;
    } else {
        updateCustomPassport();
    }

    if (passportCropper) {
        passportCropper.setAspectRatio(passportWidthCm / passportHeightCm);
    }
}

function updateCustomPassport() {
    const unit = document.querySelector('input[name="punit"]:checked')?.value || 'cm';
    const wEl = document.getElementById('pcustom-w');
    const hEl = document.getElementById('pcustom-h');
    const w = (wEl ? parseFloat(wEl.value) : 3.5) || 3.5;
    const h = (hEl ? parseFloat(hEl.value) : 4.5) || 4.5;

    if (unit === 'cm') {
        passportWidthCm = w;
        passportHeightCm = h;
    } else if (unit === 'mm') {
        passportWidthCm = w / 10;
        passportHeightCm = h / 10;
    } else if (unit === 'in') {
        passportWidthCm = w * 2.54;
        passportHeightCm = h * 2.54;
    } else {
        passportWidthCm = w;
        passportHeightCm = h;
    }

    if (passportCropper) {
        passportCropper.setAspectRatio(passportWidthCm / passportHeightCm);
    }
}

function resetPassport() {
    if (passportCropper) passportCropper.reset();
}

function downloadPassportCropped() {
    if (!passportCropper) return;
    try {
        showGlobalLoading('Generating passport photo...', 'Passport Maker');
        const dpiEl = document.getElementById('passport-dpi');
        const dpi = (dpiEl ? parseInt(dpiEl.value) : 300) || 300;
        const pxW = Math.round((passportWidthCm / 2.54) * dpi);
        const pxH = Math.round((passportHeightCm / 2.54) * dpi);

        const canvas = passportCropper.getCroppedCanvas({ width: pxW, height: pxH });
        canvas.toBlob(blob => {
            try {
                if (window.AndroidAds) window.AndroidAds.showInterstitial();
                downloadFile(blob, '1010Tool-Passport-Photo.jpg', 'image/jpeg');
                playSound('success');
            } finally {
                hideGlobalLoading();
            }
        }, 'image/jpeg', 0.95);
    } catch (e) {
        hideGlobalLoading();
        console.error('Passport cropped failed:', e);
    }
}

function generatePassportA4() {
    if (!passportCropper) return;
    try {
        showGlobalLoading('Generating A4 sheet grid...', 'Passport Maker');
        setTimeout(() => {
            try {
                const dpiEl = document.getElementById('passport-dpi');
                const dpi = (dpiEl ? parseInt(dpiEl.value) : 300) || 300;
                const pxW = Math.round((passportWidthCm / 2.54) * dpi);
                const pxH = Math.round((passportHeightCm / 2.54) * dpi);
                const singleCanvas = passportCropper.getCroppedCanvas({ width: pxW, height: pxH });

                // A4 at 300 DPI is approx 2480 x 3508 pixels
                const a4Canvas = document.createElement('canvas');
                a4Canvas.width = 2480;
                a4Canvas.height = 3508;
                const ctx = a4Canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height);

                const marginX = 140;
                const marginY = 160;
                const gap = 40;

                const cols = Math.floor((a4Canvas.width - marginX * 2) / (pxW + gap));
                const rows = Math.floor((a4Canvas.height - marginY * 2) / (pxH + gap));

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = marginX + c * (pxW + gap);
                        const y = marginY + r * (pxH + gap);
                        ctx.drawImage(singleCanvas, x, y, pxW, pxH);
                        ctx.strokeStyle = '#cccccc';
                        ctx.strokeRect(x, y, pxW, pxH);
                    }
                }

                a4Canvas.toBlob(blob => {
                    try {
                        if (window.AndroidAds) window.AndroidAds.showInterstitial();
                        downloadFile(blob, '1010Tool-Passport-A4-Sheet.jpg', 'image/jpeg');
                        playSound('success');
                    } finally {
                        hideGlobalLoading();
                    }
                }, 'image/jpeg', 0.95);
            } catch (err) {
                hideGlobalLoading();
                console.error(err);
            }
        }, 50);
    } catch (e) {
        hideGlobalLoading();
        console.error('Passport A4 failed:', e);
    }
}

// Collage & Joiner Integration
let joinImgFiles = [];

function handleJoinImgUpload(input) {
    if (!input.files || input.files.length === 0) return;
    joinImgFiles = Array.from(input.files);
    document.getElementById('joinimg-btn').disabled = false;
    updateJoinImgPreview();
}

async function updateJoinImgPreview() {
    if (joinImgFiles.length === 0) return;
    const canvas = document.getElementById('joinimg-preview-canvas');
    const emptyState = document.getElementById('joinimg-empty-state');
    canvas.style.display = 'block';
    emptyState.style.display = 'none';

    const spacing = parseInt(document.getElementById('joinimg-spacing').value) || 10;
    const bgColor = document.getElementById('joinimg-bg').value || '#ffffff';

    const images = await Promise.all(joinImgFiles.map(f => loadImageFromFile(f)));
    const count = images.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const cellW = 300;
    const cellH = 300;
    canvas.width = cols * cellW + (cols + 1) * spacing;
    canvas.height = rows * cellH + (rows + 1) * spacing;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    images.forEach((img, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = spacing + c * (cellW + spacing);
        const y = spacing + r * (cellH + spacing);

        const scale = Math.max(cellW / img.width, cellH / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const ox = (cellW - nw) / 2;
        const oy = (cellH - nh) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, cellW, cellH);
        ctx.clip();
        ctx.drawImage(img, x + ox, y + oy, nw, nh);
        ctx.restore();
    });
}

function processJoinImages() {
    try {
        showGlobalLoading('Generating image collage...', 'Photo Collage');
        const canvas = document.getElementById('joinimg-preview-canvas');
        const format = document.getElementById('joinimg-format').value;
        canvas.toBlob(blob => {
            try {
                if (window.AndroidAds) window.AndroidAds.showInterstitial();
                downloadFile(blob, '1010Tool-Collage.png', format);
                playSound('success');
            } finally {
                hideGlobalLoading();
            }
        }, format);
    } catch (e) {
        hideGlobalLoading();
        console.error('Join images failed:', e);
    }
}

// Advanced PNG Suite Tools
const pngToolsData = [
    { id: 'png2jpg', title: 'PNG to JPG', displayTitle: 'PNG to<br>JPG', desc: 'Convert PNG to universal JPG format with solid white background.', badge: 'POPULAR', format: 'PNG → JPG', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
    { id: 'png2webp', title: 'PNG to WebP', displayTitle: 'PNG to<br>WebP', desc: 'Convert to ultra-light modern WebP format for fast web loading.', badge: 'CONVERTER', format: 'PNG → WEBP', icon: '<svg viewBox="0 0 24 24"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>' },
    { id: 'invert', title: 'Invert Colors', displayTitle: 'Invert<br>Colors', desc: 'Invert all RGB color channels in your PNG image instantly.', badge: 'FILTER', format: '.PNG', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z"/></svg>' },
    { id: 'grayscale', title: 'PNG Grayscale', displayTitle: 'PNG<br>Grayscale', desc: 'Convert PNG colors to rich monochromatic grayscale tones.', badge: 'FILTER', format: 'B&W .PNG', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/></svg>' },
    { id: 'blur', title: 'Blur Filter', displayTitle: 'Blur<br>Filter', desc: 'Apply adjustable smooth Gaussian blur (1px–20px) to images.', badge: 'ADJUST', format: '1–20 PX', icon: '<svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' },
    { id: 'sharpen', title: 'Sharpen Image', displayTitle: 'Sharpen<br>Image', desc: 'Enhance fine details and edge clarity with 3×3 convolution.', badge: 'PRO', format: '3×3 MATRIX', icon: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
    { id: 'brightness', title: 'Brightness & Contrast', displayTitle: 'Brightness &<br>Contrast', desc: 'Fine-tune image exposure and contrast levels from 50% to 200%.', badge: 'ADJUST', format: '50–200%', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>' },
    { id: 'transparent', title: 'Make Background Transparent', displayTitle: 'Transparent<br>Background', desc: 'Sample corner background color and remove it with custom tolerance.', badge: 'POPULAR', format: 'ALPHA .PNG', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>' },
    { id: 'favicon', title: 'Favicon Generator', displayTitle: 'Favicon<br>Generator', desc: 'Export 16×16, 32×32, and 48×48 PNG favicons bundled in a ZIP archive.', badge: 'BUNDLE', format: '.ZIP', icon: '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' }
];

function renderPngSuite() {
    try {
        const grid = document.getElementById('png-suite-grid');
        if (!grid) return;
        grid.classList.add('tool-grid');
        grid.innerHTML = pngToolsData.map(tool => `
            <button type="button" class="tool-card png-card" data-png-tool="${tool.id}" aria-label="${escapeHtml(tool.title)}: ${escapeHtml(tool.desc)}" onclick="openPngTool('${tool.id}')">
                <span class="tool-icon" aria-hidden="true">${tool.icon}</span>
                <span class="tool-name">${tool.displayTitle || escapeHtml(tool.title)}</span>
            </button>
        `).join('');
    } catch (err) {
        console.error('Error in renderPngSuite:', err);
        if (typeof showRenderErrorBoundary === 'function') {
            showRenderErrorBoundary(err, 'pngsuite');
        }
    }
}

let activePngTool = null;
let pngWorkingImage = null;
let pngWsCtx = null;
let pngFaviconOffCanvas = null;
let pngFaviconOffCtx = null;

function openPngTool(toolId) {
    try {
        activePngTool = toolId;
        const tool = pngToolsData.find(t => t.id === toolId);
        if (!tool) return;

        const main = document.getElementById('png-suite-main');
        const ws = document.getElementById('png-workspace');
        if (main) main.style.display = 'none';
        if (ws) ws.style.display = 'block';
        const titleEl = document.getElementById('png-ws-title');
        const descEl = document.getElementById('png-ws-desc');
        if (titleEl) titleEl.innerText = tool.title;
        if (descEl) descEl.innerText = tool.desc;

        const statusEl = document.getElementById('png-ws-status');
        if (statusEl) {
            statusEl.innerText = '';
            statusEl.style.display = 'none';
        }

        let controlsEl = document.getElementById('png-ws-controls');
        if (!controlsEl && ws) {
            controlsEl = document.createElement('div');
            controlsEl.id = 'png-ws-controls';
            controlsEl.className = 'options';
            controlsEl.style.cssText = 'display: none; flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 20px;';
            const previewWrap = document.getElementById('png-ws-preview-wrap');
            if (previewWrap && previewWrap.nextSibling) {
                ws.insertBefore(controlsEl, previewWrap.nextSibling);
            } else {
                ws.appendChild(controlsEl);
            }
        }

        if (controlsEl) {
            if (toolId === 'blur') {
                controlsEl.style.display = 'flex';
                controlsEl.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label for="png-blur-val" style="font-weight:600; display:flex; justify-content:space-between;">
                            <span>Blur Radius:</span>
                            <span id="png-blur-label" style="font-family:'JetBrains Mono', monospace;">5px</span>
                        </label>
                        <input type="range" id="png-blur-val" aria-label="Blur radius in pixels" min="1" max="20" step="1" value="5" />
                    </div>
                `;
                const blurInput = document.getElementById('png-blur-val');
                if (blurInput) {
                    blurInput.addEventListener('input', function() {
                        const lbl = document.getElementById('png-blur-label');
                        if (lbl) lbl.innerText = this.value + 'px';
                        updatePngLivePreview();
                    });
                }
            } else if (toolId === 'brightness') {
                controlsEl.style.display = 'flex';
                controlsEl.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label for="png-bright-val" style="font-weight:600; display:flex; justify-content:space-between;">
                            <span>Brightness:</span>
                            <span id="png-bright-label" style="font-family:'JetBrains Mono', monospace;">100%</span>
                        </label>
                        <input type="range" id="png-bright-val" aria-label="Brightness percentage" min="50" max="200" step="1" value="100" />
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label for="png-contrast-val" style="font-weight:600; display:flex; justify-content:space-between;">
                            <span>Contrast:</span>
                            <span id="png-contrast-label" style="font-family:'JetBrains Mono', monospace;">100%</span>
                        </label>
                        <input type="range" id="png-contrast-val" aria-label="Contrast percentage" min="50" max="200" step="1" value="100" />
                    </div>
                `;
                const brightInput = document.getElementById('png-bright-val');
                const contrastInput = document.getElementById('png-contrast-val');
                if (brightInput) {
                    brightInput.addEventListener('input', function() {
                        const lbl = document.getElementById('png-bright-label');
                        if (lbl) lbl.innerText = this.value + '%';
                        updatePngLivePreview();
                    });
                }
                if (contrastInput) {
                    contrastInput.addEventListener('input', function() {
                        const lbl = document.getElementById('png-contrast-label');
                        if (lbl) lbl.innerText = this.value + '%';
                        updatePngLivePreview();
                    });
                }
            } else if (toolId === 'transparent') {
                controlsEl.style.display = 'flex';
                controlsEl.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label for="png-tol-val" style="font-weight:600; display:flex; justify-content:space-between;">
                            <span>Color Tolerance:</span>
                            <span id="png-tol-label" style="font-family:'JetBrains Mono', monospace;">30</span>
                        </label>
                        <input type="range" id="png-tol-val" aria-label="Transparency color tolerance" min="5" max="100" step="1" value="30" />
                    </div>
                `;
                const tolInput = document.getElementById('png-tol-val');
                if (tolInput) {
                    tolInput.addEventListener('input', function() {
                        const lbl = document.getElementById('png-tol-label');
                        if (lbl) lbl.innerText = this.value;
                        updatePngLivePreview();
                    });
                }
            } else {
                controlsEl.style.display = 'none';
                controlsEl.innerHTML = '';
            }
        }

        // If an image is already loaded in the PNG Suite workspace, immediately update the live preview for this tool
        if (pngWorkingImage) {
            updatePngLivePreview();
        }
    } catch (err) {
        console.error('Error in openPngTool:', err);
        if (typeof showRenderErrorBoundary === 'function') {
            showRenderErrorBoundary(err, 'pngsuite');
        }
    }
}

function closePngWorkspace() {
    try {
        const main = document.getElementById('png-suite-main');
        const ws = document.getElementById('png-workspace');
        if (main) main.style.display = 'block';
        if (ws) ws.style.display = 'none';
    } catch (err) {
        console.error('Error in closePngWorkspace:', err);
    }
}

function loadPngWorkspaceImage(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            pngWorkingImage = img;
            const previewWrap = document.getElementById('png-ws-preview-wrap');
            if (previewWrap) previewWrap.style.display = 'block';
            const emptyState = document.getElementById('png-ws-empty-state');
            if (emptyState) emptyState.style.display = 'none';
            const dimBadge = document.getElementById('png-ws-dim-badge');
            if (dimBadge) dimBadge.innerText = `${img.width} × ${img.height} px`;
            const canvas = document.getElementById('png-ws-canvas');
            if (canvas) {
                canvas.style.display = 'block';
            }
            updatePngLivePreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updatePngLivePreview() {
    if (!pngWorkingImage) return;
    const canvas = document.getElementById('png-ws-canvas');
    if (!canvas) return;

    const previewWrap = document.getElementById('png-ws-preview-wrap');
    if (previewWrap && previewWrap.style.display === 'none') {
        previewWrap.style.display = 'block';
    }
    const emptyState = document.getElementById('png-ws-empty-state');
    if (emptyState && emptyState.style.display !== 'none') {
        emptyState.style.display = 'none';
    }
    if (canvas.style.display === 'none') {
        canvas.style.display = 'block';
    }

    if (!pngWsCtx) {
        pngWsCtx = canvas.getContext('2d');
    }
    const ctx = pngWsCtx;

    if (canvas.width !== pngWorkingImage.width || canvas.height !== pngWorkingImage.height) {
        canvas.width = pngWorkingImage.width;
        canvas.height = pngWorkingImage.height;
    }

    ctx.filter = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activePngTool === 'png2jpg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(pngWorkingImage, 0, 0);
    } else if (activePngTool === 'png2webp' || activePngTool === 'favicon') {
        ctx.drawImage(pngWorkingImage, 0, 0);
    } else if (activePngTool === 'blur') {
        const blurVal = parseFloat(document.getElementById('png-blur-val')?.value) || 5;
        ctx.filter = 'blur(' + blurVal + 'px)';
        ctx.drawImage(pngWorkingImage, 0, 0);
        ctx.filter = 'none';
    } else if (activePngTool === 'brightness') {
        const bVal = parseFloat(document.getElementById('png-bright-val')?.value) || 100;
        const cVal = parseFloat(document.getElementById('png-contrast-val')?.value) || 100;
        ctx.filter = 'brightness(' + bVal + '%) contrast(' + cVal + '%)';
        ctx.drawImage(pngWorkingImage, 0, 0);
        ctx.filter = 'none';
    } else {
        ctx.drawImage(pngWorkingImage, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        if (activePngTool === 'grayscale') {
            for (let i = 0; i < d.length; i += 4) {
                const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                d[i] = gray;
                d[i + 1] = gray;
                d[i + 2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (activePngTool === 'invert') {
            for (let i = 0; i < d.length; i += 4) {
                d[i] = 255 - d[i];
                d[i + 1] = 255 - d[i + 1];
                d[i + 2] = 255 - d[i + 2];
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (activePngTool === 'transparent') {
            const tol = parseInt(document.getElementById('png-tol-val')?.value) || 30;
            const targetR = d[0], targetG = d[1], targetB = d[2];
            for (let i = 0; i < d.length; i += 4) {
                if (Math.abs(d[i] - targetR) <= tol && Math.abs(d[i + 1] - targetG) <= tol && Math.abs(d[i + 2] - targetB) <= tol) {
                    d[i + 3] = 0;
                }
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (activePngTool === 'sharpen') {
            const w = canvas.width;
            const h = canvas.height;
            const src = new Uint8ClampedArray(d);
            const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    let r = 0, g = 0, b = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const py = Math.min(h - 1, Math.max(0, y + ky));
                            const px = Math.min(w - 1, Math.max(0, x + kx));
                            const kWeight = kernel[(ky + 1) * 3 + (kx + 1)];
                            if (kWeight !== 0) {
                                const idx = (py * w + px) * 4;
                                r += src[idx] * kWeight;
                                g += src[idx + 1] * kWeight;
                                b += src[idx + 2] * kWeight;
                            }
                        }
                    }
                    const dstIdx = (y * w + x) * 4;
                    d[dstIdx] = Math.min(255, Math.max(0, r));
                    d[dstIdx + 1] = Math.min(255, Math.max(0, g));
                    d[dstIdx + 2] = Math.min(255, Math.max(0, b));
                    d[dstIdx + 3] = src[dstIdx + 3];
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }
    }
}
window.updatePngLivePreview = updatePngLivePreview;

function executePngTool() {
    if (!pngWorkingImage) {
        alert('Please upload an image first.');
        return;
    }
    const canvas = document.getElementById('png-ws-canvas');
    if (!canvas) return;

    // Ensure the live preview canvas has the latest state rendered
    if (canvas.width === 0 || canvas.height === 0) {
        updatePngLivePreview();
    }

    setStatus('png-ws', 'loading', '⏳ Exporting image...');
    setTimeout(async () => {
        try {
            await yieldToMain();
            if (activePngTool === 'png2jpg') {
                canvas.toBlob(blob => {
                    if (window.AndroidAds) window.AndroidAds.showInterstitial();
                    downloadFile(blob, '1010Tool-png2jpg.jpg', 'image/jpeg');
                    setStatus('png-ws', 'success', '✅ Converted to JPG successfully!');
                    playSound('success');
                }, 'image/jpeg', 0.92);
                return;
            } else if (activePngTool === 'png2webp') {
                canvas.toBlob(blob => {
                    if (window.AndroidAds) window.AndroidAds.showInterstitial();
                    downloadFile(blob, '1010Tool-png2webp.webp', 'image/webp');
                    setStatus('png-ws', 'success', '✅ Converted to WebP successfully!');
                    playSound('success');
                }, 'image/webp', 0.90);
                return;
            } else if (activePngTool === 'favicon') {
                if (!checkCdnDependencies(['JSZip'], 'png-ws')) return;
                if (!pngFaviconOffCanvas) {
                    pngFaviconOffCanvas = document.createElement('canvas');
                    pngFaviconOffCtx = pngFaviconOffCanvas.getContext('2d');
                }
                const sizes = [16, 32, 48];
                const zip = new JSZip();
                for (const sz of sizes) {
                    await yieldToMain();
                    pngFaviconOffCanvas.width = sz;
                    pngFaviconOffCanvas.height = sz;
                    pngFaviconOffCtx.clearRect(0, 0, sz, sz);
                    pngFaviconOffCtx.drawImage(canvas, 0, 0, sz, sz);
                    const pngBlob = await new Promise(resolve => pngFaviconOffCanvas.toBlob(resolve, 'image/png'));
                    zip.file(`favicon-${sz}x${sz}.png`, pngBlob);
                }
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                if (window.AndroidAds) window.AndroidAds.showInterstitial();
                downloadFile(zipBlob, '1010Tool-Favicons.zip', 'application/zip');
                setStatus('png-ws', 'success', '✅ Favicon package (16x16, 32x32, 48x48) downloaded!');
                playSound('success');
                return;
            }

            canvas.toBlob(blob => {
                if (window.AndroidAds) window.AndroidAds.showInterstitial();
                downloadFile(blob, `1010Tool-${activePngTool}.png`, 'image/png');
                setStatus('png-ws', 'success', '✅ PNG processed & downloaded!');
                playSound('success');
            }, 'image/png');
        } catch (e) {
            setStatus('png-ws', 'error', '❌ Export failed: ' + e.message);
            playSound('error');
        }
    }, 20);
}

// ==========================================
// 3. QR CODE ENGINE
// ==========================================

let qrCodeStylingInstance = null;

function updateQrFields() {
    try {
        const type = document.getElementById('qr-type')?.value;
        const container = document.getElementById('qr-fields-container');
        if (!container) return;

        const inputStyle = 'width:100%;padding:9px 11px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-family:inherit;font-size:0.86rem;';
        if (type === 'url') {
            container.innerHTML = `<input type="url" id="qr-input-1" aria-label="Web URL" placeholder="https://example.com" style="${inputStyle}" oninput="updateQrPreview()" />`;
        } else if (type === 'upi') {
            container.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:12px;">
                    <div>
                        <label for="qr-upi-id" style="display:block;font-size:0.76rem;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--text);margin-bottom:4px;">PAYEE UPI ID <span style="color:var(--accent);">*</span></label>
                        <input type="text" id="qr-upi-id" required aria-label="Payee UPI ID" placeholder="merchant@upi" style="${inputStyle}font-family:'JetBrains Mono',monospace;" oninput="updateQrPreview()" />
                    </div>
                    <div>
                        <label for="qr-upi-name" style="display:block;font-size:0.76rem;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--text);margin-bottom:4px;">PAYEE NAME <span style="color:var(--accent);">*</span></label>
                        <input type="text" id="qr-upi-name" required aria-label="Payee Name" placeholder="Store / Recipient Name" style="${inputStyle}" oninput="updateQrPreview()" />
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div>
                            <label for="qr-upi-amount" style="display:block;font-size:0.75rem;font-family:'JetBrains Mono',monospace;color:var(--text-light);margin-bottom:4px;">AMOUNT (₹ OPTIONAL)</label>
                            <input type="number" id="qr-upi-amount" aria-label="Amount in INR" placeholder="e.g. 250" min="0" step="any" style="${inputStyle}font-family:'JetBrains Mono',monospace;" oninput="updateQrPreview()" />
                        </div>
                        <div>
                            <label for="qr-upi-note" style="display:block;font-size:0.75rem;font-family:'JetBrains Mono',monospace;color:var(--text-light);margin-bottom:4px;">NOTE (OPTIONAL)</label>
                            <input type="text" id="qr-upi-note" aria-label="Transaction Note" placeholder="Order #1010" style="${inputStyle}" oninput="updateQrPreview()" />
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'text') {
            container.innerHTML = `<textarea id="qr-input-1" aria-label="Plain text message" placeholder="Enter plain text message..." style="${inputStyle}height:80px;" oninput="updateQrPreview()"></textarea>`;
        } else if (type === 'wifi') {
            container.innerHTML = `
                <input type="text" id="qr-input-ssid" aria-label="Wi-Fi Network SSID" placeholder="Network SSID (Name)" style="${inputStyle}margin-bottom:6px;" oninput="updateQrPreview()" />
                <input type="password" id="qr-input-pass" aria-label="Wi-Fi Network Password" placeholder="Network Password" style="${inputStyle}" oninput="updateQrPreview()" />
            `;
        } else if (type === 'email') {
            container.innerHTML = `
                <input type="email" id="qr-input-email" aria-label="Recipient Email Address" placeholder="recipient@example.com" style="${inputStyle}margin-bottom:6px;" oninput="updateQrPreview()" />
                <input type="text" id="qr-input-sub" aria-label="Email Subject" placeholder="Subject" style="${inputStyle}" oninput="updateQrPreview()" />
            `;
        } else if (type === 'phone' || type === 'sms' || type === 'whatsapp') {
            container.innerHTML = `<input type="tel" id="qr-input-1" aria-label="Phone Number" placeholder="+1234567890" style="${inputStyle}font-family:'JetBrains Mono',monospace;" oninput="updateQrPreview()" />`;
        } else {
            container.innerHTML = `<input type="text" id="qr-input-1" aria-label="Details" placeholder="Enter details..." style="${inputStyle}" oninput="updateQrPreview()" />`;
        }
    } catch (err) {
        console.error('Error in updateQrFields:', err);
    }
}

function getQrPayload() {
    const type = document.getElementById('qr-type')?.value || 'url';
    if (type === 'upi') {
        const id = (document.getElementById('qr-upi-id')?.value || '').trim();
        const name = (document.getElementById('qr-upi-name')?.value || '').trim();
        const amount = (document.getElementById('qr-upi-amount')?.value || '').trim();
        const note = (document.getElementById('qr-upi-note')?.value || '').trim();
        return `upi://pay?pa=${encodeURIComponent(id)}&pn=${encodeURIComponent(name)}&am=${encodeURIComponent(amount)}&tn=${encodeURIComponent(note)}&cu=INR`;
    } else if (type === 'wifi') {
        const ssid = document.getElementById('qr-input-ssid')?.value || '';
        const pass = document.getElementById('qr-input-pass')?.value || '';
        return `WIFI:T:WPA;S:${ssid};P:${pass};;`;
    } else if (type === 'email') {
        const email = document.getElementById('qr-input-email')?.value || '';
        const sub = document.getElementById('qr-input-sub')?.value || '';
        return `mailto:${email}?subject=${encodeURIComponent(sub)}`;
    } else if (type === 'phone') {
        const p = document.getElementById('qr-input-1')?.value || '';
        return `tel:${p}`;
    } else if (type === 'whatsapp') {
        const p = document.getElementById('qr-input-1')?.value || '';
        return `https://wa.me/${p.replace(/[^0-9]/g, '')}`;
    }
    return document.getElementById('qr-input-1')?.value || 'https://1010tool.com';
}

function updateQrPreview() {
    const previewContainer = document.getElementById('qr-preview-canvas');
    if (!previewContainer) return;
    if (!checkCdnDependencies(['QRCodeStyling'], 'qrcode')) return;

    try {
        previewContainer.innerHTML = '';
        const payload = getQrPayload();
        const fg = document.getElementById('qr-fg')?.value || '#000000';
        const bg = document.getElementById('qr-bg')?.value || '#ffffff';
        const pattern = document.getElementById('qr-pattern')?.value || 'square';
        const corner = document.getElementById('qr-corner')?.value || 'square';

        qrCodeStylingInstance = new QRCodeStyling({
            width: 220,
            height: 220,
            data: payload,
            dotsOptions: { color: fg, type: pattern },
            cornersSquareOptions: { type: corner },
            backgroundOptions: { color: bg }
        });

        qrCodeStylingInstance.append(previewContainer);
    } catch (err) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'QR preview failed: ' + err.message, source: 'updateQrPreview', stack: err.stack });
    }
}

function processQrCode() {
    if (!checkCdnDependencies(['QRCodeStyling'], 'qrcode')) return;
    if (!qrCodeStylingInstance) return;
    try {
        if (window.AndroidAds) window.AndroidAds.showInterstitial();
        qrCodeStylingInstance.download({ name: '1010Tool-QRCode', extension: 'png' });
        playSound('success');
    } catch (err) {
        errorLogger.record({ type: 'TOOL_ERROR', message: 'QR download failed: ' + err.message, source: 'processQrCode', stack: err.stack });
    }
}

// ==========================================
// 3.1 QR CODE SCANNER (CAMERA & IMAGE)
// ==========================================
// Disable Chromium WebView's native BarcodeDetector wrapper (which relies on Google Play Services Vision
// and spams `E/cr_BarcodeDetectionImpl: BarcodeDetector is not operational` when Play Services barcode
// module is unavailable) so Html5Qrcode always uses its built-in pure-JS ZXing decoder.
function disableBrokenNativeBarcodeDetector() {
    try {
        if ('BarcodeDetector' in window) {
            delete window.BarcodeDetector;
        }
    } catch (_) {}
    try {
        Object.defineProperty(window, 'BarcodeDetector', {
            value: undefined,
            configurable: true,
            writable: true
        });
    } catch (_) {}
}
disableBrokenNativeBarcodeDetector();

let html5QrScannerInstance = null;
let isQrCameraRunning = false;
let availableCameras = [];
let currentCameraIndex = 0;
let isQrTorchOn = false;
let currentDecodedPayload = null;
let currentDecodedType = 'text';

function initQrScannerTool() {
    disableBrokenNativeBarcodeDetector();
    renderQrScanHistory();
    populateCameraDevices();
}

function switchQrScanMode(mode) {
    const camTab = document.getElementById('qr-tab-cam');
    const fileTab = document.getElementById('qr-tab-file');
    const camSec = document.getElementById('qr-cam-section');
    const fileSec = document.getElementById('qr-file-section');

    if (mode === 'camera') {
        camTab?.classList.add('active');
        camTab?.setAttribute('aria-selected', 'true');
        fileTab?.classList.remove('active');
        fileTab?.setAttribute('aria-selected', 'false');
        if (camSec) camSec.style.display = 'block';
        if (fileSec) fileSec.style.display = 'none';
    } else {
        stopQrCamera();
        fileTab?.classList.add('active');
        fileTab?.setAttribute('aria-selected', 'true');
        camTab?.classList.remove('active');
        camTab?.setAttribute('aria-selected', 'false');
        if (fileSec) fileSec.style.display = 'block';
        if (camSec) camSec.style.display = 'none';
    }
}

function requestAndroidCameraPermission() {
    return new Promise((resolve) => {
        if (!window.AndroidBridge || typeof window.AndroidBridge.requestCameraPermission !== 'function') {
            resolve(true);
            return;
        }
        let resolved = false;
        window.onAndroidCameraPermissionResult = function(granted) {
            if (!resolved) {
                resolved = true;
                resolve(!!granted);
            }
        };
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                const has = window.AndroidBridge.hasCameraPermission ? window.AndroidBridge.hasCameraPermission() : false;
                resolve(has);
            }
        }, 12000);
        try {
            window.AndroidBridge.requestCameraPermission();
        } catch (_) {
            resolve(true);
        }
    });
}

async function populateCameraDevices() {
    const select = document.getElementById('qr-camera-select');
    const flipBtn = document.getElementById('qr-flip-btn');
    if (!select) return;

    try {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = (allDevices || []).filter(d => d && d.kind === 'videoinput' && d.deviceId);
            if (videoDevices.length > 0) {
                availableCameras = videoDevices.map((d, idx) => ({
                    id: d.deviceId,
                    label: d.label || (idx === 0 ? 'Rear / Primary Camera' : `Camera ${idx + 1}`)
                }));
                const currentVal = select.value;
                select.innerHTML = '';
                availableCameras.forEach((device) => {
                    const opt = document.createElement('option');
                    opt.value = device.id;
                    opt.text = device.label;
                    if (currentVal && currentVal === device.id) {
                        opt.selected = true;
                    }
                    select.appendChild(opt);
                });
                if (flipBtn) {
                    flipBtn.style.display = availableCameras.length > 1 ? 'inline-flex' : 'none';
                }
                return;
            }
        }
    } catch (e) {
        console.warn('Could not enumerate cameras:', e);
    }

    if (select.children.length === 0 || select.options.length <= 1) {
        select.innerHTML = `
            <option value="environment" selected>Default (Rear Camera)</option>
            <option value="user">Front Camera (Selfie)</option>
        `;
    }
    if (flipBtn) {
        flipBtn.style.display = 'inline-flex';
    }
}

async function startQrCamera() {
    disableBrokenNativeBarcodeDetector();

    if (typeof Html5Qrcode === 'undefined') {
        setStatusMsg('qr-cam-status', '⚠️ Scanner library is loading. Please wait a moment.', 'error');
        return;
    }

    if (isQrCameraRunning) return;

    const placeholder = document.getElementById('qr-cam-placeholder');
    const startBtn = document.getElementById('qr-start-btn');
    const stopBtn = document.getElementById('qr-stop-btn');
    const laser = document.getElementById('qr-laser');
    const reticle = document.getElementById('qr-reticle');
    const bracketTr = document.getElementById('qr-bracket-tr');
    const bracketBl = document.getElementById('qr-bracket-bl');
    const reticleOverlay = document.getElementById('qr-reticle-overlay');

    setStatusMsg('qr-cam-status', '⏳ Requesting camera permission...', 'info');

    // Proactive Android native permission check and request
    if (window.AndroidBridge && typeof window.AndroidBridge.hasCameraPermission === 'function') {
        try {
            const hasPerm = window.AndroidBridge.hasCameraPermission();
            if (!hasPerm) {
                const granted = await requestAndroidCameraPermission();
                if (!granted) {
                    setStatusMsg('qr-cam-status', '⚠️ Camera permission was not granted. Please allow camera access in device settings, or switch to the "Upload Image File" tab!', 'error');
                    return;
                }
            }
        } catch (bridgeErr) {
            console.warn('AndroidBridge camera permission check error:', bridgeErr);
        }
    }

    try {
        if (placeholder) placeholder.style.display = 'none';

        if (!html5QrScannerInstance) {
            html5QrScannerInstance = new Html5Qrcode("qr-camera-stream", {
                verbose: false,
                useBarCodeDetectorIfSupported: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: false
                }
            });
        }

        const select = document.getElementById('qr-camera-select');
        const selectedVal = select ? select.value : '';
        let cameraConfig;
        if (!selectedVal || selectedVal === 'environment') {
            cameraConfig = { facingMode: "environment" };
        } else if (selectedVal === 'user') {
            cameraConfig = { facingMode: "user" };
        } else {
            cameraConfig = selectedVal;
        }

        const config = {
            fps: 10,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
                const minEdge = Math.min(viewfinderWidth || 240, viewfinderHeight || 240);
                const qrboxSize = Math.max(100, Math.min(Math.max(100, minEdge - 20), Math.floor(minEdge * 0.72)));
                return { width: qrboxSize, height: qrboxSize };
            }
        };

        const onScanSuccess = (decodedText, decodedResult) => {
            onQrCodeScanned(decodedText, decodedResult, 'Live Camera');
        };
        const onScanFailure = () => {
            // scanning frame error (normal during frame analysis)
        };

        try {
            await html5QrScannerInstance.start(cameraConfig, config, onScanSuccess, onScanFailure);
        } catch (firstErr) {
            console.warn('Initial camera start failed, attempting fallback...', firstErr);
            try {
                await html5QrScannerInstance.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
            } catch (secondErr) {
                await html5QrScannerInstance.start({ facingMode: "user" }, config, onScanSuccess, onScanFailure);
            }
        }

        isQrCameraRunning = true;
        if (placeholder) placeholder.style.display = 'none';
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-flex';
        if (laser) laser.style.display = 'block';
        if (reticle) reticle.style.display = 'block';
        if (bracketTr) bracketTr.style.display = 'block';
        if (bracketBl) bracketBl.style.display = 'block';
        if (reticleOverlay) reticleOverlay.style.display = 'block';

        setStatusMsg('qr-cam-status', '🟢 Camera scanning active. Center a QR code inside the box.', 'success');

        populateCameraDevices();
        checkQrTorchSupport();
    } catch (err) {
        console.error('Failed to start camera:', err);
        isQrCameraRunning = false;
        if (placeholder) placeholder.style.display = 'flex';
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (stopBtn) stopBtn.style.display = 'none';
        if (laser) laser.style.display = 'none';
        if (reticle) reticle.style.display = 'none';
        if (bracketTr) bracketTr.style.display = 'none';
        if (bracketBl) bracketBl.style.display = 'none';
        if (reticleOverlay) reticleOverlay.style.display = 'none';

        let friendlyError = '⚠️ Unable to access camera.';
        const errStr = (err && (err.name || err.message || String(err))) || '';
        if (errStr.includes('NotAllowedError') || errStr.includes('PermissionDeniedError') || errStr.includes('Permission')) {
            friendlyError = '⚠️ Camera permission was denied. Please allow camera access in device settings, or switch to the "Upload Image File" tab!';
        } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError') || errStr.includes('NotReadableError') || errStr.includes('OverconstrainedError')) {
            friendlyError = '⚠️ No usable camera detected or camera is in use by another app. You can scan QR codes using the "Upload Image File" tab!';
        } else {
            friendlyError = `⚠️ Camera error: ${err?.message || err}. You can switch to "Upload Image File" to scan QR codes.`;
        }
        setStatusMsg('qr-cam-status', friendlyError, 'error');
    }
}

async function stopQrCamera() {
    if (!html5QrScannerInstance) return;

    try {
        if (isQrCameraRunning) {
            await html5QrScannerInstance.stop();
        }
        try {
            html5QrScannerInstance.clear();
        } catch (_) {}
    } catch (err) {
        console.warn('Error while stopping camera:', err);
    } finally {
        isQrCameraRunning = false;
        isQrTorchOn = false;
        const placeholder = document.getElementById('qr-cam-placeholder');
        const startBtn = document.getElementById('qr-start-btn');
        const stopBtn = document.getElementById('qr-stop-btn');
        const laser = document.getElementById('qr-laser');
        const reticle = document.getElementById('qr-reticle');
        const bracketTr = document.getElementById('qr-bracket-tr');
        const bracketBl = document.getElementById('qr-bracket-bl');
        const torchBtn = document.getElementById('qr-torch-btn');
        const reticleOverlayStop = document.getElementById('qr-reticle-overlay');

        if (placeholder) placeholder.style.display = 'flex';
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (stopBtn) stopBtn.style.display = 'none';
        if (laser) laser.style.display = 'none';
        if (reticle) reticle.style.display = 'none';
        if (bracketTr) bracketTr.style.display = 'none';
        if (bracketBl) bracketBl.style.display = 'none';
        if (torchBtn) {
            torchBtn.style.display = 'none';
            torchBtn.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Torch';
            torchBtn.style.background = '';
            torchBtn.style.color = '';
        }
        if (reticleOverlayStop) reticleOverlayStop.style.display = 'none';

        setStatusMsg('qr-cam-status', 'Camera stopped.', 'info');
    }
}

async function flipQrCamera() {
    const select = document.getElementById('qr-camera-select');
    if (select && select.options.length > 1) {
        select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
    }
    if (isQrCameraRunning) {
        await stopQrCamera();
        await startQrCamera();
    }
}

// Auto release camera when document/tab becomes hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && typeof isQrCameraRunning !== 'undefined' && isQrCameraRunning) {
        stopQrCamera();
    }
});

async function onQrCameraSelected(camId) {
    if (isQrCameraRunning) {
        await stopQrCamera();
        await startQrCamera();
    }
}

function checkQrTorchSupport() {
    const torchBtn = document.getElementById('qr-torch-btn');
    if (!torchBtn || !html5QrScannerInstance) return;
    try {
        const capabilities = html5QrScannerInstance.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
            torchBtn.style.display = 'inline-flex';
        } else {
            torchBtn.style.display = 'none';
        }
    } catch (_) {
        torchBtn.style.display = 'none';
    }
}

async function toggleQrTorch() {
    if (!html5QrScannerInstance || !isQrCameraRunning) return;
    try {
        isQrTorchOn = !isQrTorchOn;
        await html5QrScannerInstance.applyVideoConstraints({
            advanced: [{ torch: isQrTorchOn }]
        });
        const torchBtn = document.getElementById('qr-torch-btn');
        if (torchBtn) {
            const boltSvg = '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
            torchBtn.innerHTML = isQrTorchOn ? `${boltSvg} Torch (On)` : `${boltSvg} Torch`;
            torchBtn.style.background = isQrTorchOn ? 'var(--accent)' : '';
            torchBtn.style.color = isQrTorchOn ? '#FAF8F5' : '';
        }
    } catch (e) {
        console.warn('Torch toggle failed:', e);
    }
}

// Scanning from image file (or clipboard paste)
async function scanQrFromInput(file) {
    disableBrokenNativeBarcodeDetector();

    if (!file) return;
    if (typeof Html5Qrcode === 'undefined') {
        setStatus('qr-file', 'error', '⚠️ Scanner library is loading. Please try again.');
        return;
    }

    const previewBox = document.getElementById('qr-file-preview-box');
    const previewImg = document.getElementById('qr-file-preview-img');

    try {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (previewImg) previewImg.src = e.target.result;
            if (previewBox) previewBox.style.display = 'block';
        };
        reader.readAsDataURL(file);

        setStatus('qr-file', 'loading', '⏳ Decoding QR code from image...');

        let fileScanner = new Html5Qrcode("qr-file-reader-target", {
            verbose: false,
            useBarCodeDetectorIfSupported: false,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: false
            }
        });
        let decodedText = null;
        try {
            decodedText = await fileScanner.scanFile(file, false);
        } finally {
            try { fileScanner.clear(); } catch (_) {}
        }

        if (decodedText) {
            setStatus('qr-file', 'success', '✅ QR code successfully detected!');
            onQrCodeScanned(decodedText, null, `Image: ${file.name || 'Uploaded File'}`);
        } else {
            throw new Error('No QR code detected');
        }
    } catch (err) {
        console.warn('File QR decode failed:', err);
        setStatus('qr-file', 'error', '❌ No readable QR code found in this image. Please ensure the QR code is sharp, well-lit, and not cropped.');
        playSound('error');
    }
}

async function pasteQrFromClipboard() {
    try {
        if (!navigator.clipboard || !navigator.clipboard.read) {
            const pastePrompt = prompt('Paste your QR code content:');
            if (pastePrompt) onQrCodeScanned(pastePrompt, null, 'Pasted Text');
            return;
        }

        const items = await navigator.clipboard.read();
        for (const item of items) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getType(type);
                    const file = new File([blob], 'clipboard-pasted-qr.png', { type });
                    scanQrFromInput(file);
                    return;
                }
            }
        }

        const text = await navigator.clipboard.readText();
        if (text) {
            onQrCodeScanned(text, null, 'Clipboard Text');
        } else {
            setStatus('qr-file', 'error', '⚠️ No image found in your clipboard.');
        }
    } catch (err) {
        console.warn('Clipboard read error:', err);
        setStatus('qr-file', 'error', '⚠️ Clipboard access was not granted or contains no image.');
    }
}

function onQrCodeScanned(rawText, resultObj, sourceLabel) {
    if (!rawText) return;

    if (rawText === currentDecodedPayload && isQrCameraRunning) {
        return;
    }

    currentDecodedPayload = rawText;
    playSound('success');
    if (typeof triggerHaptic === 'function') triggerHaptic('success');

    // Trigger visual target lock animation on reticle frame
    const reticleFrame = document.getElementById('qr-reticle-frame');
    if (reticleFrame) {
        reticleFrame.classList.add('scanned');
        setTimeout(() => {
            reticleFrame.classList.remove('scanned');
        }, 550);
    }

    const parsed = parseQrPayloadData(rawText);
    currentDecodedType = parsed.type;

    const resultCard = document.getElementById('qr-scan-result');
    const badgeEl = document.getElementById('qr-result-type-badge');
    const timeEl = document.getElementById('qr-result-time');
    const contentEl = document.getElementById('qr-result-content');
    const detailsEl = document.getElementById('qr-structured-details');
    const primaryBtn = document.getElementById('qr-action-primary');

    if (badgeEl) {
        badgeEl.innerHTML = `${parsed.icon} ${parsed.type.toUpperCase()}`;
    }
    if (timeEl) {
        timeEl.innerText = `${sourceLabel || 'Scanned'} • ${new Date().toLocaleTimeString()}`;
    }
    if (contentEl) {
        contentEl.innerText = rawText;
    }

    if (detailsEl) {
        if (parsed.detailsHtml) {
            detailsEl.innerHTML = parsed.detailsHtml;
            detailsEl.style.display = 'block';
        } else {
            detailsEl.style.display = 'none';
        }
    }

    if (primaryBtn) {
        primaryBtn.innerHTML = parsed.primaryActionText;
    }

    if (resultCard) {
        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    saveQrToScanHistory({
        text: rawText,
        type: parsed.type,
        icon: parsed.icon,
        title: parsed.summaryTitle,
        timestamp: Date.now()
    });
}

function parseQrPayloadData(text) {
    const trimmed = (text || '').trim();

    // 1. Web URL
    if (/^https?:\/\//i.test(trimmed)) {
        return {
            type: 'url',
            icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
            summaryTitle: trimmed,
            primaryActionText: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Open Website URL',
            detailsHtml: `<div style="color:var(--text); font-weight:600;">Link Destination:</div><a href="${trimmed}" target="_blank" style="color:var(--accent); word-break:break-all;">${trimmed}</a>`
        };
    }

    // 2. Wi-Fi Config: WIFI:T:WPA;S:MySSID;P:MyPassword;;
    if (/^WIFI:/i.test(trimmed)) {
        const ssidMatch = trimmed.match(/S:([^;]+)/i);
        const passMatch = trimmed.match(/P:([^;]+)/i);
        const typeMatch = trimmed.match(/T:([^;]+)/i);
        const ssid = ssidMatch ? ssidMatch[1] : 'Unknown Network';
        const pass = passMatch ? passMatch[1] : '';
        const authType = typeMatch ? typeMatch[1] : 'WPA/WPA2';

        return {
            type: 'wifi',
            icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
            summaryTitle: `Wi-Fi: ${ssid}`,
            primaryActionText: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Wi-Fi Password',
            detailsHtml: `
                <div style="font-weight:700; margin-bottom:4px; color:var(--text);">Wi-Fi Network Credentials:</div>
                <div><strong>Network (SSID):</strong> ${ssid}</div>
                <div><strong>Security:</strong> ${authType}</div>
                <div><strong>Password:</strong> <code style="font-size:0.95rem; font-weight:bold; font-family:'JetBrains Mono', monospace; background:var(--bg); border:1px solid var(--border); padding:2px 6px; border-radius:4px;">${pass || '(None)'}</code></div>
            `
        };
    }

    // 3. Email Address
    if (/^mailto:/i.test(trimmed) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        const email = trimmed.replace(/^mailto:/i, '').split('?')[0];
        return {
            type: 'email',
            icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
            summaryTitle: email,
            primaryActionText: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Send Email',
            detailsHtml: `<div><strong>Email Recipient:</strong> ${email}</div>`
        };
    }

    // 4. Phone Number
    if (/^tel:/i.test(trimmed) || /^\+?[0-9\s\-()]{7,20}$/.test(trimmed)) {
        const phone = trimmed.replace(/^tel:/i, '');
        return {
            type: 'phone',
            icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
            summaryTitle: phone,
            primaryActionText: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Call Number',
            detailsHtml: `<div><strong>Phone Number:</strong> ${phone}</div>`
        };
    }

    // 5. SMS
    if (/^smsto:/i.test(trimmed) || /^sms:/i.test(trimmed)) {
        const parts = trimmed.replace(/^(smsto|sms):/i, '').split(':');
        const phone = parts[0] || '';
        const msg = parts[1] || '';
        return {
            type: 'sms',
            icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
            summaryTitle: `SMS to ${phone}`,
            primaryActionText: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Send SMS',
            detailsHtml: `<div><strong>Send To:</strong> ${phone}</div>${msg ? `<div><strong>Message:</strong> ${msg}</div>` : ''}`
        };
    }

    // 6. vCard Contact
    if (/^BEGIN:VCARD/i.test(trimmed)) {
        const fnMatch = trimmed.match(/FN:([^\r\n]+)/i);
        const telMatch = trimmed.match(/TEL[^\:]*:([^\r\n]+)/i);
        const emailMatch = trimmed.match(/EMAIL[^\:]*:([^\r\n]+)/i);
        const name = fnMatch ? fnMatch[1] : 'Contact';

        return {
            type: 'contact',
            icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
            summaryTitle: `Contact: ${name}`,
            primaryActionText: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Contact Data',
            detailsHtml: `
                <div style="font-weight:700; color:var(--text);">Contact Card (vCard):</div>
                <div><strong>Name:</strong> ${name}</div>
                ${telMatch ? `<div><strong>Phone:</strong> ${telMatch[1]}</div>` : ''}
                ${emailMatch ? `<div><strong>Email:</strong> ${emailMatch[1]}</div>` : ''}
            `
        };
    }

    // 7. General Text
    return {
        type: 'text',
        icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        summaryTitle: trimmed.length > 40 ? trimmed.substring(0, 40) + '...' : trimmed,
        primaryActionText: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Text',
        detailsHtml: null
    };
}

function executeQrPrimaryAction() {
    if (!currentDecodedPayload) return;
    const trimmed = currentDecodedPayload.trim();

    if (/^https?:\/\//i.test(trimmed)) {
        window.open(trimmed, '_blank');
    } else if (/^WIFI:/i.test(trimmed)) {
        const passMatch = trimmed.match(/P:([^;]+)/i);
        const pass = passMatch ? passMatch[1] : '';
        if (pass) {
            navigator.clipboard.writeText(pass);
            alertToast('Wi-Fi Password copied to clipboard!');
        } else {
            copyQrDecodedText();
        }
    } else if (/^mailto:/i.test(trimmed)) {
        window.location.href = trimmed;
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        window.location.href = `mailto:${trimmed}`;
    } else if (/^tel:/i.test(trimmed)) {
        window.location.href = trimmed;
    } else if (/^\+?[0-9\s\-()]{7,20}$/.test(trimmed)) {
        window.location.href = `tel:${trimmed}`;
    } else if (/^sms:/i.test(trimmed) || /^smsto:/i.test(trimmed)) {
        window.location.href = trimmed;
    } else {
        copyQrDecodedText();
    }
}

function copyQrDecodedText() {
    if (!currentDecodedPayload) return;
    navigator.clipboard.writeText(currentDecodedPayload).then(() => {
        alertToast('Copied to clipboard!');
        playSound('click');
    }).catch(() => {
        alertToast('Failed to copy text.');
    });
}

function searchQrOnWeb() {
    if (!currentDecodedPayload) return;
    const query = encodeURIComponent(currentDecodedPayload);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
}

function openQrInGenerator() {
    if (!currentDecodedPayload) return;
    showTool('qrcode');
    const qrTypeEl = document.getElementById('qr-type');
    const inputContainer = document.getElementById('qr-fields-container');

    if (/^https?:\/\//i.test(currentDecodedPayload)) {
        if (qrTypeEl) qrTypeEl.value = 'url';
    } else if (/^WIFI:/i.test(currentDecodedPayload)) {
        if (qrTypeEl) qrTypeEl.value = 'wifi';
    } else {
        if (qrTypeEl) qrTypeEl.value = 'text';
    }

    if (typeof updateQrFields === 'function') updateQrFields();

    const textInput = inputContainer ? inputContainer.querySelector('input, textarea') : null;
    if (textInput) {
        textInput.value = currentDecodedPayload;
    }

    if (typeof updateQrPreview === 'function') updateQrPreview();
    alertToast('Opened in QR Code Generator!');
}

function resetQrScanResult() {
    currentDecodedPayload = null;
    const resultCard = document.getElementById('qr-scan-result');
    if (resultCard) resultCard.style.display = 'none';

    const camTab = document.getElementById('qr-tab-cam');
    if (camTab && camTab.classList.contains('active')) {
        startQrCamera();
    }
}

// Recent Scan History Storage (localStorage)
function saveQrToScanHistory(item) {
    try {
        let history = JSON.parse(localStorage.getItem('qr_scan_history') || '[]');
        if (history.length > 0 && history[0].text === item.text) {
            return;
        }
        history.unshift(item);
        if (history.length > 20) history = history.slice(0, 20);
        localStorage.setItem('qr_scan_history', JSON.stringify(history));
        renderQrScanHistory();
    } catch (_) {}
}

function renderQrScanHistory() {
    const list = document.getElementById('qr-history-list');
    if (!list) return;

    try {
        const history = JSON.parse(localStorage.getItem('qr_scan_history') || '[]');
        if (history.length === 0) {
            list.innerHTML = '<div style="color:var(--text-light); font-size:0.85rem; padding:8px 0;">No recent scans yet.</div>';
            return;
        }

        list.innerHTML = history.map((item, idx) => `
            <div class="qr-history-item" onclick="onHistoryItemClicked(${idx})" style="cursor:pointer;" title="Click to view details">
                <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                    <span style="display:inline-flex; color:var(--accent);">${item.icon || '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'}</span>
                    <span style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:240px; color:var(--text);">${escapeHtml(item.title || item.text)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                    <span style="font-size:0.75rem; color:var(--text-light); font-family:'JetBrains Mono', monospace;">${formatTimeAgo(item.timestamp)}</span>
                    <button type="button" class="btn-subtle" onclick="event.stopPropagation(); navigator.clipboard.writeText('${escapeQuotes(item.text)}'); alertToast('Copied!');" style="padding:4px 8px; font-size:0.75rem;" title="Copy"><svg class="icon-svg" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.warn('Failed to render QR history:', e);
    }
}

function onHistoryItemClicked(index) {
    try {
        const history = JSON.parse(localStorage.getItem('qr_scan_history') || '[]');
        if (history[index]) {
            onQrCodeScanned(history[index].text, null, 'History Item');
        }
    } catch (_) {}
}

function clearQrScanHistory() {
    localStorage.removeItem('qr_scan_history');
    renderQrScanHistory();
    alertToast('Scan history cleared.');
}

function setStatusMsg(elementId, text, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerText = text;
    if (type === 'error') {
        el.style.color = 'var(--error)';
    } else if (type === 'success') {
        el.style.color = 'var(--success)';
    } else {
        el.style.color = 'var(--text-light)';
    }
}

function alertToast(msg) {
    if (window.AndroidBridge && window.AndroidBridge.showToast) {
        window.AndroidBridge.showToast(msg);
    } else {
        showGlobalToast(msg);
    }
}

function showGlobalToast(msg) {
    let toast = document.getElementById('app-global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-global-toast';
        toast.style.cssText = 'position:fixed; bottom:calc(76px + env(safe-area-inset-bottom, 0px)); left:50%; transform:translateX(-50%); background:var(--text); color:var(--surface); padding:10px 20px; border-radius:6px; border:1px solid var(--border); font-family:"Plus Jakarta Sans",sans-serif; font-size:0.88rem; font-weight:700; z-index:999999; box-shadow:2px 2px 0px #1C1917; pointer-events:none; transition:opacity 0.2s ease;';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.opacity = '0';
    }, 2400);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function formatTimeAgo(ts) {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ==========================================
// 4. CALCULATORS HUB
// ==========================================

const calculatorsData = [
    { id: 'emi', title: 'Loan / EMI Calculator', displayTitle: 'Loan / EMI<br>Calculator', badge: 'POPULAR', format: 'FINANCE', icon: '<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', desc: 'Calculate monthly loan repayments, interest rates, and total payable amount.' },
    { id: 'bmi', title: 'BMI Calculator', displayTitle: 'BMI<br>Calculator', badge: 'HEALTH', format: 'KG / CM', icon: '<svg viewBox="0 0 24 24"><path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>', desc: 'Compute Body Mass Index and health classification from weight and height.' },
    { id: 'age', title: 'Age Calculator', displayTitle: 'Age<br>Calculator', badge: 'POPULAR', format: 'Y / M / D', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', desc: 'Calculate exact chronological age in years, months, days, and next birthday.' },
    { id: 'discount', title: 'Discount Calculator', displayTitle: 'Discount<br>Calculator', badge: 'RETAIL', format: '% OFF', icon: '<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>', desc: 'Determine exact sale savings and final checkout price after discount.' },
    { id: 'percent', title: 'Percentage Calculator', displayTitle: 'Percentage<br>Calculator', badge: 'MATH', format: '% DELTA', icon: '<svg viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>', desc: 'Compute percentage shares, increases, and decreases instantaneously.' },
    { id: 'tip', title: 'Tip & Split Calculator', displayTitle: 'Tip & Split<br>Calculator', badge: 'DINING', format: 'PER PERSON', icon: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', desc: 'Calculate total gratuity tip amount and split the bill evenly per person.' }
];

function renderCalculators() {
    try {
        const cat = document.getElementById('calc-categories');
        if (!cat) return;
        cat.classList.add('tool-grid');
        cat.innerHTML = calculatorsData.map(c => `
            <button type="button" class="tool-card png-card" data-calc-tool="${c.id}" aria-label="${escapeHtml(c.title)}: ${escapeHtml(c.desc)}" onclick="openCalculator('${c.id}')">
                <span class="tool-icon" aria-hidden="true">${c.icon}</span>
                <span class="tool-name">${c.displayTitle || escapeHtml(c.title)}</span>
            </button>
        `).join('');
    } catch (err) {
        console.error('Error in renderCalculators:', err);
        if (typeof showRenderErrorBoundary === 'function') {
            showRenderErrorBoundary(err, 'calculators');
        }
    }
}

let activeCalc = null;

function openCalculator(id) {
    try {
        activeCalc = id;
        const hub = document.getElementById('calc-hub');
        const active = document.getElementById('calc-active');
        if (hub) hub.style.display = 'none';
        if (active) active.style.display = 'block';

        const calc = calculatorsData.find(c => c.id === id);
        const titleEl = document.getElementById('calc-title');
        if (titleEl && calc) titleEl.innerHTML = `<span class="emoji">${calc.icon}</span> ${escapeHtml(calc.title)}`;

        const inputs = document.getElementById('calc-inputs');
        if (inputs) {
            if (id === 'emi') {
                inputs.innerHTML = `
                    <label>Loan Amount (₹): <input type="number" id="c-p" aria-label="Loan Amount in rupees" value="10000" /></label>
                    <label>Annual Interest Rate (%): <input type="number" id="c-r" aria-label="Annual Interest Rate percentage" value="5.5" step="0.1" /></label>
                    <label>Tenure (Years): <input type="number" id="c-t" aria-label="Tenure in years" value="3" /></label>
                `;
            } else if (id === 'bmi') {
                inputs.innerHTML = `
                    <label>Weight (kg): <input type="number" id="c-w" aria-label="Weight in kilograms" value="70" /></label>
                    <label>Height (cm): <input type="number" id="c-h" aria-label="Height in centimeters" value="175" /></label>
                `;
            } else if (id === 'age') {
                inputs.innerHTML = `
                    <label>Date of Birth: <input type="date" id="c-dob" aria-label="Date of Birth" value="2000-01-01" /></label>
                `;
            } else if (id === 'discount') {
                inputs.innerHTML = `
                    <label>Original Price (₹): <input type="number" id="c-price" aria-label="Original Price in rupees" value="100" /></label>
                    <label>Discount Percentage (%): <input type="number" id="c-disc" aria-label="Discount Percentage" value="20" /></label>
                `;
            } else if (id === 'percent') {
                inputs.innerHTML = `
                    <label>Percentage (%): <input type="number" id="c-pct" aria-label="Percentage value" value="20" step="any" /></label>
                    <label>Total Value: <input type="number" id="c-total" aria-label="Total Value" value="500" step="any" /></label>
                `;
            } else if (id === 'tip') {
                inputs.innerHTML = `
                    <label>Bill Amount (₹): <input type="number" id="c-bill" aria-label="Bill Amount in rupees" value="1000" step="any" /></label>
                    <label>Tip Percentage (%): <input type="number" id="c-tip" aria-label="Tip Percentage" value="10" step="any" /></label>
                    <label>Number of People: <input type="number" id="c-people" aria-label="Number of People" value="1" min="1" step="1" /></label>
                `;
            } else {
                inputs.innerHTML = `<label>Value: <input type="number" id="c-val" aria-label="Value" value="50" /></label>`;
            }
        }

        const res = document.getElementById('calc-result');
        if (res) res.style.display = 'none';
    } catch (err) {
        console.error('Error in openCalculator:', err);
        if (typeof showRenderErrorBoundary === 'function') {
            showRenderErrorBoundary(err, 'calculators');
        }
    }
}

function closeCalculator() {
    try {
        const hub = document.getElementById('calc-hub');
        const active = document.getElementById('calc-active');
        if (hub) hub.style.display = 'block';
        if (active) active.style.display = 'none';
    } catch (err) {
        console.error('Error in closeCalculator:', err);
    }
}

function runCalculator() {
    try {
        const res = document.getElementById('calc-result');
        if (!res) return;
        res.style.display = 'block';

        if (activeCalc === 'emi') {
            const p = parseFloat(document.getElementById('c-p')?.value) || 0;
            const r = (parseFloat(document.getElementById('c-r')?.value) || 0) / 12 / 100;
            const n = (parseFloat(document.getElementById('c-t')?.value) || 0) * 12;
            const emi = r === 0 ? (n > 0 ? p / n : 0) : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            res.innerHTML = `Monthly EMI: ₹${emi.toFixed(2)}<br />Total Payment: ₹${(emi * n).toFixed(2)}`;
        } else if (activeCalc === 'bmi') {
            const w = parseFloat(document.getElementById('c-w')?.value) || 0;
            const h = (parseFloat(document.getElementById('c-h')?.value) || 0) / 100;
            const bmi = (w / (h * h)).toFixed(1);
            let status = 'Normal';
            if (bmi < 18.5) status = 'Underweight';
            else if (bmi >= 25 && bmi < 30) status = 'Overweight';
            else if (bmi >= 30) status = 'Obese';
            res.innerHTML = `BMI: ${bmi} (${status})`;
        } else if (activeCalc === 'age') {
            const dobStr = document.getElementById('c-dob')?.value;
            if (!dobStr) {
                res.innerHTML = 'Please select a valid Date of Birth.';
                return;
            }
            const dob = new Date(dobStr + 'T00:00:00');
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (isNaN(dob.getTime()) || dob > today) {
                res.innerHTML = 'Please select a valid past Date of Birth.';
                return;
            }
            let years = today.getFullYear() - dob.getFullYear();
            let months = today.getMonth() - dob.getMonth();
            let days = today.getDate() - dob.getDate();
            if (days < 0) {
                months--;
                const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                days += prevMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }
            const msPerDay = 1000 * 60 * 60 * 24;
            const totalDays = Math.floor((today - dob) / msPerDay);
            let nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextBday < today) {
                nextBday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
            }
            const daysUntilNext = Math.round((nextBday - today) / msPerDay);
            res.innerHTML = `Exact Age: ${years} Years, ${months} Months, ${days} Days<br />Total Days: ${totalDays.toLocaleString()} Days<br />Days Until Next Birthday: ${daysUntilNext === 0 ? '🎉 Today!' : daysUntilNext + ' Days'}`;
        } else if (activeCalc === 'discount') {
            const p = parseFloat(document.getElementById('c-price')?.value) || 0;
            const d = parseFloat(document.getElementById('c-disc')?.value) || 0;
            const savings = (p * d) / 100;
            res.innerHTML = `You Save: ₹${savings.toFixed(2)}<br />Final Price: ₹${(p - savings).toFixed(2)}`;
        } else if (activeCalc === 'percent') {
            const pct = parseFloat(document.getElementById('c-pct')?.value) || 0;
            const total = parseFloat(document.getElementById('c-total')?.value) || 0;
            const part = (pct / 100) * total;
            const increased = total + part;
            const decreased = total - part;
            res.innerHTML = `${pct}% of ${total}: ₹${part.toFixed(2)} (${part.toFixed(2)})<br />${pct}% Increase: ${increased.toFixed(2)}<br />${pct}% Decrease: ${decreased.toFixed(2)}`;
        } else if (activeCalc === 'tip') {
            const bill = parseFloat(document.getElementById('c-bill')?.value) || 0;
            const tipRaw = parseFloat(document.getElementById('c-tip')?.value);
            const tipPct = isNaN(tipRaw) ? 10 : tipRaw;
            const people = Math.max(1, parseInt(document.getElementById('c-people')?.value) || 1);
            const totalTip = (bill * tipPct) / 100;
            const totalBill = bill + totalTip;
            const perPerson = totalBill / people;
            res.innerHTML = `Total Tip: ₹${totalTip.toFixed(2)}<br />Total Bill: ₹${totalBill.toFixed(2)}<br />Per Person Split (${people}): ₹${perPerson.toFixed(2)}`;
        }
    } catch (err) {
        console.error('Error in runCalculator:', err);
    }
}

function clearCalculator() {
    try {
        const res = document.getElementById('calc-result');
        if (res) res.style.display = 'none';
    } catch (err) {
        console.error('Error in clearCalculator:', err);
    }
}

// Password Generator
function generatePassword() {
    const len = parseInt(document.getElementById('passgen-len').value) || 16;
    const uc = document.getElementById('passgen-uc').checked;
    const lc = document.getElementById('passgen-lc').checked;
    const num = document.getElementById('passgen-num').checked;
    const sym = document.getElementById('passgen-sym').checked;

    let chars = '';
    if (uc) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lc) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (num) chars += '0123456789';
    if (sym) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    let pass = '';
    const array = new Uint32Array(len);
    crypto.getRandomValues(array);
    for (let i = 0; i < len; i++) {
        pass += chars[array[i] % chars.length];
    }

    document.getElementById('passgen-output').innerText = pass;
}

function copyPassGen() {
    const out = document.getElementById('passgen-output');
    const text = out ? out.innerText : '';
    if (typeof safeCopyText === 'function') {
        safeCopyText(text, 'Password copied to clipboard!');
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
        alert('Password copied to clipboard!');
    }
}

// Word Counter
function analyzeText() {
    const input = document.getElementById('wc-input');
    const text = input ? input.value : '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const readTime = Math.ceil(words / 200);

    const wEl = document.getElementById('wc-words');
    const cEl = document.getElementById('wc-chars');
    const nsEl = document.getElementById('wc-chars-ns');
    const rEl = document.getElementById('wc-read');

    if (wEl) wEl.innerText = words;
    if (cEl) cEl.innerText = chars;
    if (nsEl) nsEl.innerText = charsNoSpaces;
    if (rEl) rEl.innerText = `${readTime}m`;
}

function copyWcText() {
    const input = document.getElementById('wc-input');
    const text = input ? input.value : '';
    if (typeof safeCopyText === 'function') {
        safeCopyText(text, 'Copied to clipboard!');
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
        alert('Copied to clipboard!');
    }
}

// ==========================================
// 5. ADVANCED SPEED & PRODUCTIVITY ENHANCEMENTS
// ==========================================

function triggerHaptic(type = 'click') {
    try {
        if (window.AndroidBridge && typeof window.AndroidBridge.hapticFeedback === 'function') {
            window.AndroidBridge.hapticFeedback(type);
        } else if (navigator.vibrate) {
            if (type === 'success') navigator.vibrate([25, 45, 25]);
            else if (type === 'error') navigator.vibrate([45, 60, 45]);
            else navigator.vibrate(15);
        }
    } catch (_) {}
}

// Quick Actions & Recents Manager
const RECENT_TOOLS_KEY = '1010_recent_tools';
const DEFAULT_QUICK_TOOLS = [
    { id: 'compress', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>', name: 'Compress PDF' },
    { id: 'qrscan', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>', name: 'Scan QR' },
    { id: 'merge', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>', name: 'Merge PDFs' },
    { id: 'split', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>', name: 'Split PDF' },
    { id: 'cropimg', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>', name: 'Crop Image' },
    { id: 'passgen', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>', name: 'Passwords' },
    { id: 'calculators', icon: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/></svg>', name: 'Calculators' }
];

function recordRecentTool(toolId) {
    if (!toolId) return;
    try {
        let recents = JSON.parse(localStorage.getItem(RECENT_TOOLS_KEY) || '[]');
        recents = recents.filter(id => id !== toolId);
        recents.unshift(toolId);
        if (recents.length > 8) recents = recents.slice(0, 8);
        localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(recents));
        renderQuickActionsBar();
    } catch (_) {}
}

function renderQuickActionsBar() {
    const bar = document.getElementById('quickActionsBar');
    if (!bar) return;
    try {
        let recents = JSON.parse(localStorage.getItem(RECENT_TOOLS_KEY) || '[]');
        const catalogMap = {};
        if (typeof ALL_TOOLS_CATALOG !== 'undefined') {
            ALL_TOOLS_CATALOG.forEach(t => { catalogMap[t.id] = t; });
        }

        const itemsToShow = [];
        const seen = new Set();

        recents.forEach(id => {
            const tool = catalogMap[id];
            if (tool && !seen.has(id)) {
                itemsToShow.push({ id: tool.id, icon: tool.icon, name: tool.title.split(' ')[0] });
                seen.add(id);
            }
        });

        DEFAULT_QUICK_TOOLS.forEach(d => {
            if (!seen.has(d.id)) {
                itemsToShow.push(d);
                seen.add(d.id);
            }
        });

        bar.innerHTML = itemsToShow.slice(0, 8).map(item => `
            <div class="quick-chip" onclick="showTool('${item.id}', null); triggerHaptic('click');" role="button" tabindex="0">
                <span>${item.icon}</span> ${escapeHtml(item.name)}
            </div>
        `).join('');
    } catch (e) {
        console.warn('Quick actions render note:', e);
    }
}

// Global Smart Drag and Drop
let droppedFileHolder = null;

function initGlobalSmartDrop() {
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            showSmartDropOverlay();
        }
    });

    const overlay = document.getElementById('smartDropOverlay');
    if (overlay) {
        overlay.addEventListener('dragleave', (e) => {
            if (e.relatedTarget === null || e.target === overlay) {
                hideSmartDropOverlay();
            }
        });

        overlay.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleGlobalFileDrop(e.dataTransfer.files[0]);
            } else {
                hideSmartDropOverlay();
            }
        });
    }
}

function showSmartDropOverlay() {
    const overlay = document.getElementById('smartDropOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideSmartDropOverlay() {
    const overlay = document.getElementById('smartDropOverlay');
    if (overlay) overlay.style.display = 'none';
    droppedFileHolder = null;
}

function handleGlobalFileDrop(file) {
    if (!file) return hideSmartDropOverlay();
    droppedFileHolder = file;

    const overlay = document.getElementById('smartDropOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    const title = document.getElementById('dropFileTitle');
    const subtitle = document.getElementById('dropFileSubtitle');
    const icon = document.getElementById('dropFileIcon');
    const actions = document.getElementById('dropFileActions');

    const fname = file.name || 'File';
    const ftype = file.type || '';
    const isPdf = ftype === 'application/pdf' || fname.toLowerCase().endsWith('.pdf');
    const isImage = ftype.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(fname);

    if (title) title.innerText = escapeHtml(fname);
    if (subtitle) subtitle.innerText = `${formatBytes(file.size)} • Select an action below:`;

    let candidateButtons = [];
    if (isPdf) {
        if (icon) icon.innerHTML = '<svg class="upload-icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        candidateButtons = [
            { id: 'compress', label: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Compress PDF' },
            { id: 'split', label: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg> Split Pages' },
            { id: 'merge', label: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Merge PDFs' },
            { id: 'grayscale', label: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z"/></svg> Grayscale' },
            { id: 'pdf2img', label: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> PDF to Img' }
        ];
    } else if (isImage) {
        if (icon) icon.innerHTML = '<svg class="upload-icon-svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
        candidateButtons = [
            { id: 'imgcompress', label: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Compress Image' },
            { id: 'cropimg', label: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg> Crop' },
            { id: 'resizeimg', label: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Resize' },
            { id: 'passport', label: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2"/><path d="M15 12h2"/><path d="M7 16h10"/></svg> Passport Photo' },
            { id: 'img2pdf', label: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Convert to PDF' },
            { id: 'qrscan', label: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Scan QR Code' }
        ];
    } else {
        if (icon) icon.innerHTML = '<svg class="upload-icon-svg" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
        candidateButtons = [
            { id: 'wordcount', label: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Word Counter' },
            { id: 'base64', label: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Base64 Tool' },
            { id: 'rename', label: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Batch Rename' }
        ];
    }

    if (actions) {
        const validButtons = candidateButtons.filter(btn => Boolean(document.getElementById(btn.id)));
        actions.innerHTML = validButtons.map(btn =>
            `<button type="button" class="smart-drop-btn" onclick="launchWithDroppedFile('${btn.id}')">${btn.label}</button>`
        ).join('');
    }
}

function launchWithDroppedFile(toolId) {
    const file = droppedFileHolder;
    hideSmartDropOverlay();
    if (!file || !toolId || !document.getElementById(toolId)) return;

    if (typeof showTool === 'function') {
        showTool(toolId);
    }

    // Attach dropped file to the target tool view
    setTimeout(() => {
        if (toolId === 'qrscan' && typeof scanQrFromInput === 'function') {
            scanQrFromInput(file);
        } else if (toolId === 'cropimg' && typeof handleCropUpload === 'function') {
            handleCropUpload({ files: [file] });
        } else if (toolId === 'resizeimg' && typeof handleResizeUpload === 'function') {
            handleResizeUpload({ files: [file] });
        } else if (toolId === 'passport' && typeof handlePassportUpload === 'function') {
            handlePassportUpload({ files: [file] });
        } else if (toolId === 'wordcount') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wcInput = document.getElementById('wc-input');
                if (wcInput) {
                    wcInput.value = e.target.result || '';
                    if (typeof analyzeText === 'function') analyzeText();
                }
            };
            reader.readAsText(file);
        } else if (toolId === 'base64') {
            const isTextFile = (file.type && file.type.startsWith('text/')) || /\.(txt|json|md|csv|xml|html|js|css)$/i.test(file.name || '');
            const reader = new FileReader();
            if (isTextFile) {
                reader.onload = (e) => {
                    const b64Input = document.getElementById('b64-input');
                    if (b64Input) {
                        b64Input.value = e.target.result || '';
                        if (typeof encodeBase64 === 'function') encodeBase64();
                    }
                };
                reader.readAsText(file);
            } else {
                reader.onload = (e) => {
                    const b64Input = document.getElementById('b64-input');
                    const b64Output = document.getElementById('b64-output');
                    const dataUrl = String(e.target.result || '');
                    const base64Str = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                    if (b64Input) b64Input.value = base64Str;
                    if (b64Output) {
                        b64Output.value = base64Str;
                        b64Output.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        } else if (typeof handleFiles === 'function') {
            handleFiles({ files: [file] }, toolId);
        }
        triggerHaptic('success');
    }, 150);
}

// Initialize on DOM Ready or immediately if loaded
function initApp() {
    try {
        initDebugOverlay();
        if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
        }
        renderQuickActionsBar();
        if (typeof bindToolGridListener === 'function') {
            bindToolGridListener();
        } else {
            const toolGridEl = document.getElementById('toolGrid');
            if (toolGridEl && toolGridEl.dataset.boundClick !== 'true') {
                toolGridEl.dataset.boundClick = 'true';
                toolGridEl.addEventListener('click', (e) => {
                    const card = e.target.closest('.tool-card[data-tool]');
                    if (!card) return;
                    const toolName = card.getAttribute('data-tool');
                    if (toolName && typeof showTool === 'function') {
                        showTool(toolName, card);
                    }
                });
            }
        }
        if (typeof renderPinnedQuickLaunch === 'function') renderPinnedQuickLaunch();
        if (typeof renderHomeToolsGrid === 'function') {
            renderHomeToolsGrid(window.currentHomeCategory || 'all', document.getElementById('homeToolSearch')?.value || '');
        }
        initGlobalSmartDrop();
        renderPngSuite();
        bindImgCompressPreviewListeners();
        renderCalculators();
        updateQrFields();
        if (document.getElementById('passgen-output')) {
            generatePassword();
        }
        updateDebugDependencies();
    } catch (e) {
        errorLogger.record({
            type: 'INITIALIZATION_ERROR',
            message: 'App initialization warning: ' + e.message,
            source: 'initApp',
            stack: e.stack
        });
        console.warn('App initialization note:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
