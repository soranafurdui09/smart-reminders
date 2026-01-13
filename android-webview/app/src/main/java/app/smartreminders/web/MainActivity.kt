package app.smartreminders.web

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : AppCompatActivity() {
  private lateinit var webView: WebView
  private lateinit var splashOverlay: View

  // If I change my domain later, update the URL here
  private val startUrl = "https://smart-reminders3.vercel.app"
  private val allowedHost: String? by lazy { Uri.parse(startUrl).host }

  override fun onCreate(savedInstanceState: Bundle?) {
    installSplashScreen()
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    webView = findViewById(R.id.webview)
    splashOverlay = findViewById(R.id.splash_overlay)

    // WebView settings for a modern app-like experience.
    val settings = webView.settings
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    settings.cacheMode = WebSettings.LOAD_DEFAULT
    settings.databaseEnabled = true
    settings.loadsImagesAutomatically = true
    settings.setSupportZoom(false)
    settings.setSupportMultipleWindows(false)

    // Enable cookies so the user stays logged in across sessions.
    val cookieManager = CookieManager.getInstance()
    cookieManager.setAcceptCookie(true)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      cookieManager.setAcceptThirdPartyCookies(webView, true)
    }

    webView.webChromeClient = WebChromeClient()
    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        return handleUrl(request.url)
      }

      override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
        return handleUrl(Uri.parse(url))
      }

      override fun onPageFinished(view: WebView, url: String) {
        splashOverlay.visibility = View.GONE
      }
    }

    webView.loadUrl(startUrl)

    // Handle back navigation so the WebView behaves like a browser.
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        if (webView.canGoBack()) {
          webView.goBack()
        } else {
          finish()
        }
      }
    })
  }

  override fun onPause() {
    super.onPause()
    // Flush cookies to persistent storage.
    CookieManager.getInstance().flush()
  }

  private fun handleUrl(uri: Uri): Boolean {
    val scheme = uri.scheme ?: return true
    val host = uri.host
    val isHttp = scheme == "http" || scheme == "https"
    val isSameHost = host != null && host.equals(allowedHost, ignoreCase = true)

    if (isHttp && isSameHost) {
      return false
    }

    val intent = Intent(Intent.ACTION_VIEW, uri)
    return try {
      startActivity(intent)
      true
    } catch (error: ActivityNotFoundException) {
      true
    }
  }
}
