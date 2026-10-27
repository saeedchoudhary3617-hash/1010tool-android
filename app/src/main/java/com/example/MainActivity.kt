package com.example

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.lifecycleScope
import android.view.Gravity
import android.widget.FrameLayout
import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.unit.dp
import com.example.ui.theme.MyApplicationTheme
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    companion object {
        private const val BANNER_AD_UNIT_ID = "ca-app-pub-5272800200175412/4688633088"
        private const val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-5272800200175412/4141838179"
        private const val FALLBACK_TEST_BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"
        private const val FALLBACK_TEST_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"
    }

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var activeWebView: WebView? = null
    private var bannerAdView: AdView? = null
    private var bannerContainer: FrameLayout? = null
    private var interstitialAd: InterstitialAd? = null
    private var isInterstitialLoading: Boolean = false
    private var onCameraPermissionRequestAction: (() -> Unit)? = null
    private val isDarkModeState = mutableStateOf(false)

    fun updateDarkTheme(isDark: Boolean) {
        isDarkModeState.value = isDark
    }

    fun loadInterstitialAd(useTestFallback: Boolean = false) {
        if (isInterstitialLoading || interstitialAd != null) return
        isInterstitialLoading = true
        val unitId = if (useTestFallback) FALLBACK_TEST_INTERSTITIAL_AD_UNIT_ID else INTERSTITIAL_AD_UNIT_ID
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(
            this,
            unitId,
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    isInterstitialLoading = false
                    interstitialAd = ad
                    ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() {
                            interstitialAd = null
                            loadInterstitialAd(false)
                        }

                        override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                            interstitialAd = null
                            loadInterstitialAd(false)
                        }
                    }
                }

                override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                    isInterstitialLoading = false
                    interstitialAd = null
                    Log.w("MainActivity", "Interstitial ad ($unitId) failed to load: ${loadAdError.message}")
                    if (!useTestFallback && BuildConfig.DEBUG) {
                        loadInterstitialAd(true)
                    }
                }
            }
        )
    }

    private fun attachBannerAd(container: FrameLayout, useTestFallback: Boolean = false) {
        try {
            bannerAdView?.destroy()
        } catch (_: Exception) {}
        container.removeAllViews()

        val unitId = if (useTestFallback) FALLBACK_TEST_BANNER_AD_UNIT_ID else BANNER_AD_UNIT_ID
        val adView = AdView(container.context).apply {
            setAdSize(AdSize.BANNER)
            adUnitId = unitId
            adListener = object : AdListener() {
                override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                    Log.w("MainActivity", "Banner ad ($unitId) failed to load: ${loadAdError.message}")
                    if (!useTestFallback && BuildConfig.DEBUG) {
                        container.post {
                            attachBannerAd(container, useTestFallback = true)
                        }
                    }
                }
            }
        }
        bannerAdView = adView
        val lp = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        )
        container.addView(adView, lp)
        try {
            adView.loadAd(AdRequest.Builder().build())
        } catch (e: Exception) {
            Log.w("MainActivity", "Banner ad load error: ${e.message}")
        }
    }

    fun showInterstitialOnUiThread() {
        runOnUiThread {
            val ad = interstitialAd
            if (ad != null) {
                interstitialAd = null
                ad.show(this)
                loadInterstitialAd()
            } else {
                loadInterstitialAd()
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1010) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            activeWebView?.evaluateJavascript(
                "if (typeof window.onAndroidCameraPermissionResult === 'function') { window.onAndroidCameraPermissionResult($granted); }",
                null
            )
        }
    }

    override fun onPause() {
        super.onPause()
        try {
            bannerAdView?.pause()
            activeWebView?.evaluateJavascript("if (typeof stopQrCamera === 'function') stopQrCamera();", null)
            activeWebView?.onPause()
        } catch (_: Exception) {}
    }

    override fun onResume() {
        super.onResume()
        try {
            activeWebView?.onResume()
            bannerAdView?.resume()
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        try {
            bannerAdView?.destroy()
            bannerAdView = null
            activeWebView?.let { wv ->
                (wv.parent as? android.view.ViewGroup)?.removeView(wv)
                wv.stopLoading()
                wv.webChromeClient = null
                wv.destroy()
            }
        } catch (_: Exception) {}
        activeWebView = null
        super.onDestroy()
    }

    private fun clearUnsignedVariationsSeeds() {
        try {
            val webViewDir = File(applicationInfo.dataDir, "app_webview")
            if (webViewDir.exists()) {
                File(webViewDir, "variations_seed").delete()
                File(webViewDir, "variations_seed_new").delete()
                File(webViewDir, "variations_stamp").delete()
            }
        } catch (_: Exception) {}
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        clearUnsignedVariationsSeeds()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        try {
            MobileAds.initialize(this) {
                runOnUiThread {
                    loadInterstitialAd()
                    bannerContainer?.let { container ->
                        if (bannerAdView == null) {
                            attachBannerAd(container, useTestFallback = false)
                        }
                    }
                }
            }
            loadInterstitialAd()
        } catch (e: Exception) {
            Log.w("MainActivity", "MobileAds initialization error: ${e.message}")
        }

        setContent {
            val isDark by isDarkModeState
            val currentBg = if (isDark) Color(0xFF141413) else Color(0xFFF4F1EA)
            MyApplicationTheme(darkTheme = isDark) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(currentBg)
                        .windowInsetsPadding(WindowInsets.safeDrawing)
                ) {
                    AppWebViewScreen()
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Composable
    fun AppWebViewScreen() {
        val context = LocalContext.current
        var webViewRef by remember { mutableStateOf<WebView?>(null) }
        var canGoBack by remember { mutableStateOf(false) }
        var recreateKey by remember { mutableStateOf(0) }
        var pendingPermissionRequest by remember { mutableStateOf<PermissionRequest?>(null) }

        val cameraPermissionLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.RequestPermission()
        ) { isGranted ->
            if (isGranted) {
                pendingPermissionRequest?.let { req ->
                    req.grant(req.resources)
                }
            } else {
                pendingPermissionRequest?.deny()
                Toast.makeText(context, "Camera permission is required to scan QR codes", Toast.LENGTH_SHORT).show()
            }
            pendingPermissionRequest = null
            activeWebView?.evaluateJavascript(
                "if (typeof window.onAndroidCameraPermissionResult === 'function') { window.onAndroidCameraPermissionResult($isGranted); }",
                null
            )
        }

        onCameraPermissionRequestAction = {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }

        val filePickerLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.StartActivityForResult()
        ) { result ->
            val callback = filePathCallback
            filePathCallback = null
            if (callback == null) return@rememberLauncherForActivityResult

            if (result.resultCode == Activity.RESULT_OK) {
                val intent = result.data
                val results: Array<Uri>? = when {
                    intent?.clipData != null && intent.clipData!!.itemCount > 0 -> {
                        val clip = intent.clipData!!
                        Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                    }
                    intent?.data != null -> arrayOf(intent.data!!)
                    else -> null
                }
                callback.onReceiveValue(results)
            } else {
                callback.onReceiveValue(null)
            }
        }

        BackHandler(enabled = true) {
            webViewRef?.let { webView ->
                webView.evaluateJavascript("window.handleBackNavigation ? window.handleBackNavigation() : false") { result ->
                    val isHandled = result == "true" || result == "\"true\""
                    if (!isHandled) {
                        if (webView.canGoBack()) {
                            webView.goBack()
                        } else {
                            (context as? Activity)?.finish()
                        }
                    }
                }
            } ?: run {
                (context as? Activity)?.finish()
            }
        }

        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            key(recreateKey) {
                AndroidView(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    factory = { ctx ->
                        clearUnsignedVariationsSeeds()
                        WebView(ctx).apply {
                            // Always use software layer on WebView to prevent emulator GPU renderer crashes
                            setLayerType(View.LAYER_TYPE_SOFTWARE, null)
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false)
                            }
                            setBackgroundColor(android.graphics.Color.parseColor("#F4F1EA"))
                            @Suppress("DEPRECATION")
                            settings.apply {
                                javaScriptEnabled = true
                                domStorageEnabled = true
                                databaseEnabled = true
                                allowFileAccess = true
                                allowContentAccess = true
                                // Required so file:///android_asset/www/index.html can spawn local PDF.js Web Workers (libs/pdf.worker.min.js)
                                allowFileAccessFromFileURLs = true
                                allowUniversalAccessFromFileURLs = false
                                useWideViewPort = true
                                loadWithOverviewMode = true
                                cacheMode = WebSettings.LOAD_DEFAULT
                                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                displayZoomControls = false
                                builtInZoomControls = false
                                mediaPlaybackRequiresUserGesture = false
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    safeBrowsingEnabled = false
                                }
                            }

                            addJavascriptInterface(
                                WebAppInterface(this@MainActivity),
                                "AndroidBridge"
                            )
                            addJavascriptInterface(
                                AndroidAds(this@MainActivity),
                                "AndroidAds"
                            )

                            webViewClient = object : WebViewClient() {
                                override fun shouldOverrideUrlLoading(
                                    view: WebView?,
                                    request: WebResourceRequest?
                                ): Boolean {
                                    val url = request?.url?.toString() ?: return false
                                    if (url.startsWith("file://") || url.startsWith("data:") || url.startsWith("blob:")) {
                                        return false
                                    }
                                    return try {
                                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                        context.startActivity(browserIntent)
                                        true
                                    } catch (_: Exception) {
                                        false
                                    }
                                }

                                override fun onPageFinished(view: WebView?, url: String?) {
                                    super.onPageFinished(view, url)
                                    canGoBack = view?.canGoBack() == true
                                }

                                override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
                                    Log.w("MainActivity", "WebView render process gone, didCrash=${detail?.didCrash()}")
                                    try {
                                        (view?.parent as? android.view.ViewGroup)?.removeView(view)
                                        view?.destroy()
                                    } catch (_: Exception) {}
                                    webViewRef = null
                                    recreateKey++
                                    return true
                                }

                                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                                    super.onReceivedError(view, request, error)
                                    if (request?.isForMainFrame == true) {
                                        Log.w("MainActivity", "WebView main frame error: ${error?.description}")
                                    }
                                }
                            }

                            webChromeClient = object : WebChromeClient() {
                                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                                    Log.d("WebViewConsole", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()}")
                                    return true
                                }

                                override fun onPermissionRequest(request: PermissionRequest?) {
                                    if (request == null) return
                                    val resources = request.resources
                                    var needsCamera = false
                                    for (r in resources) {
                                        if (r == PermissionRequest.RESOURCE_VIDEO_CAPTURE) {
                                            needsCamera = true
                                            break
                                        }
                                    }

                                    if (needsCamera) {
                                        if (context.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                                            pendingPermissionRequest = request
                                            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                                        } else {
                                            request.grant(resources)
                                        }
                                    } else {
                                        request.grant(resources)
                                    }
                                }

                                override fun onShowFileChooser(
                                    webView: WebView?,
                                    filePathCallback: ValueCallback<Array<Uri>>?,
                                    fileChooserParams: FileChooserParams?
                                ): Boolean {
                                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                                    this@MainActivity.filePathCallback = filePathCallback

                                    val allowsMultiple = fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE
                                    val rawAcceptTypes = fileChooserParams?.acceptTypes
                                    val mimeTypes = normalizeMimeTypes(rawAcceptTypes)

                                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                                        addCategory(Intent.CATEGORY_OPENABLE)
                                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowsMultiple)
                                        if (mimeTypes.size == 1) {
                                            type = mimeTypes[0]
                                        } else {
                                            type = "*/*"
                                            putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
                                        }
                                    }

                                    val chooserTitle = if (allowsMultiple) "Select File(s)" else "Select File"
                                    try {
                                        filePickerLauncher.launch(
                                            Intent.createChooser(intent, chooserTitle)
                                        )
                                    } catch (e: Exception) {
                                        Log.w("MainActivity", "File chooser intent launch failed: ${e.message}")
                                        try {
                                            filePickerLauncher.launch(intent)
                                        } catch (e2: Exception) {
                                            Log.e("MainActivity", "Direct intent launch failed: ${e2.message}")
                                            this@MainActivity.filePathCallback?.onReceiveValue(null)
                                            this@MainActivity.filePathCallback = null
                                            Toast.makeText(context, "Cannot open file picker", Toast.LENGTH_SHORT).show()
                                            return false
                                        }
                                    }
                                    return true
                                }
                            }

                            loadUrl("file:///android_asset/www/index.html")
                            webViewRef = this
                            activeWebView = this
                        }
                    },
                    update = {
                        canGoBack = it.canGoBack()
                    }
                )
            }

            // Bottom AdMob Banner AdView
            AndroidView(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 50.dp)
                    .wrapContentHeight(),
                factory = { ctx ->
                    FrameLayout(ctx).apply {
                        bannerContainer = this
                        attachBannerAd(this, useTestFallback = false)
                    }
                }
            )
        }
    }

    class AndroidAds(private val activity: MainActivity) {
        @JavascriptInterface
        fun showInterstitial() {
            activity.showInterstitialOnUiThread()
        }
    }

    class WebAppInterface(private val activity: ComponentActivity) {

        @JavascriptInterface
        fun updateTheme(isDark: Boolean) {
            activity.runOnUiThread {
                (activity as? MainActivity)?.updateDarkTheme(isDark)
            }
        }

        @JavascriptInterface
        fun hasCameraPermission(): Boolean {
            return activity.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        }

        @JavascriptInterface
        fun requestCameraPermission() {
            activity.runOnUiThread {
                (activity as? MainActivity)?.onCameraPermissionRequestAction?.invoke()
                    ?: activity.requestPermissions(arrayOf(Manifest.permission.CAMERA), 1010)
            }
        }

        @JavascriptInterface
        fun closeApp() {
            activity.runOnUiThread {
                activity.finish()
            }
        }

        @JavascriptInterface
        fun exitApp() {
            activity.runOnUiThread {
                activity.finish()
            }
        }

        @JavascriptInterface
        fun showToast(message: String) {
            activity.runOnUiThread {
                Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun hapticFeedback(type: String) {
            activity.runOnUiThread {
                try {
                    val decor = activity.window?.decorView
                    when (type.lowercase()) {
                        "light", "click" -> decor?.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                        "medium" -> decor?.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                        "heavy" -> decor?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                        "success", "confirm" -> {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                decor?.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                            } else {
                                decor?.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                            }
                        }
                        "error", "reject" -> {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                decor?.performHapticFeedback(HapticFeedbackConstants.REJECT)
                            } else {
                                decor?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                            }
                        }
                        else -> decor?.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                    }
                } catch (_: Exception) {}
            }
        }

        @JavascriptInterface
        fun downloadBlob(dataUrl: String, filename: String, mimeType: String) {
            activity.lifecycleScope.launch(Dispatchers.IO) {
                try {
                    val rawBase64 = if (dataUrl.contains(",")) {
                        dataUrl.substringAfter(",")
                    } else {
                        dataUrl
                    }
                    val bytes = Base64.decode(rawBase64, Base64.DEFAULT)
                    saveFileToDownloads(bytes, filename, mimeType)
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(activity, "Failed to save file: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        private suspend fun saveFileToDownloads(bytes: ByteArray, filename: String, mimeType: String) {
            val resolver = activity.contentResolver
            val effectiveMime = if (mimeType.isNotBlank()) mimeType else "application/octet-stream"

            var outputStream: OutputStream? = null

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                        put(MediaStore.MediaColumns.MIME_TYPE, effectiveMime)
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/1010Tool")
                    }
                    val savedUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    if (savedUri != null) {
                        outputStream = resolver.openOutputStream(savedUri)
                    }
                } else {
                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val appDir = File(downloadsDir, "1010Tool")
                    if (!appDir.exists()) appDir.mkdirs()
                    val targetFile = File(appDir, filename)
                    outputStream = FileOutputStream(targetFile)
                }

                if (outputStream != null) {
                    outputStream.use { out ->
                        out.write(bytes)
                        out.flush()
                    }
                    withContext(Dispatchers.Main) {
                        Toast.makeText(activity, "Saved to Downloads/1010Tool: $filename", Toast.LENGTH_LONG).show()
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(activity, "Could not open output stream for download", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(activity, "Download error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun normalizeMimeTypes(acceptTypes: Array<String>?): List<String> {
        if (acceptTypes == null || acceptTypes.isEmpty()) {
            return listOf("*/*")
        }
        val mimeList = mutableListOf<String>()
        for (entry in acceptTypes) {
            if (entry.isBlank()) continue
            val parts = entry.split(",")
            for (part in parts) {
                val trimmed = part.trim()
                if (trimmed.isEmpty()) continue
                val mime = when {
                    trimmed == "*/*" -> "*/*"
                    trimmed.contains("/") -> trimmed.lowercase()
                    trimmed.startsWith(".") -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(trimmed.substring(1).lowercase())
                    else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(trimmed.lowercase())
                } ?: when (trimmed.removePrefix(".").lowercase()) {
                    "pdf" -> "application/pdf"
                    "jpg", "jpeg" -> "image/jpeg"
                    "png" -> "image/png"
                    "webp" -> "image/webp"
                    "gif" -> "image/gif"
                    "txt" -> "text/plain"
                    "json" -> "application/json"
                    else -> "*/*"
                }
                if (mime.isNotBlank() && !mimeList.contains(mime)) {
                    mimeList.add(mime)
                }
            }
        }
        return if (mimeList.isEmpty()) listOf("*/*") else mimeList
    }
}
