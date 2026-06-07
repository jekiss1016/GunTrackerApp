package com.example.armoryvaultpro

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.example.armoryvaultpro.theme.ArmoryVaultProTheme

// Set this to your published GitHub Pages URL
// For local emulator testing against a live server, you can use "http://10.0.2.2:5500" or similar
const val PUBLISHED_WEB_APP_URL = "https://jekiss1016.github.io/GunTrackerApp/"

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ArmoryVaultProTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WebViewScreen(
                        url = PUBLISHED_WEB_APP_URL,
                        modifier = Modifier.safeDrawingPadding()
                    )
                }
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebViewScreen(url: String, modifier: Modifier = Modifier) {
    val uploadMessageCallback = remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }

    // File chooser launcher for camera and image gallery uploads
    val fileChooserLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val intentData: Intent? = result.data
            val results = if (intentData != null) {
                val dataString = intentData.dataString
                val clipData = intentData.clipData
                if (clipData != null) {
                    val count = clipData.itemCount
                    val uris = Array(count) { i -> clipData.getItemAt(i).uri }
                    uris
                } else if (dataString != null) {
                    arrayOf(Uri.parse(dataString))
                } else {
                    null
                }
            } else {
                null
            }
            uploadMessageCallback.value?.onReceiveValue(results)
        } else {
            uploadMessageCallback.value?.onReceiveValue(null)
        }
        uploadMessageCallback.value = null
    }

    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                webViewClient = object : WebViewClient() {
                    // Prevent page redirects from opening in external default browsers
                    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                        if (url != null) {
                            view?.loadUrl(url)
                        }
                        return true
                    }
                }
                
                webChromeClient = object : WebChromeClient() {
                    // Custom file selector listener to bridge native file picker and web upload input
                    override fun onShowFileChooser(
                        webView: WebView?,
                        filePathCallback: ValueCallback<Array<Uri>>?,
                        fileChooserParams: FileChooserParams?
                    ): Boolean {
                        uploadMessageCallback.value?.onReceiveValue(null)
                        uploadMessageCallback.value = filePathCallback

                        val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                            type = "image/*"
                            addCategory(Intent.CATEGORY_OPENABLE)
                        }
                        
                        try {
                            fileChooserLauncher.launch(intent)
                        } catch (e: Exception) {
                            uploadMessageCallback.value?.onReceiveValue(null)
                            uploadMessageCallback.value = null
                            return false
                        }
                        return true
                    }
                }

                // Configure WebView settings for database storage and performance
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    allowFileAccess = true
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    
                    // User Agent tweaks if needed
                    userAgentString = userAgentString + " ArmoryVaultAndroidNative"
                }

                loadUrl(url)
            }
        }
    )
}
