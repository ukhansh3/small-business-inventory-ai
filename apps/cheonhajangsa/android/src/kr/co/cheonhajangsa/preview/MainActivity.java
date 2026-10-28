package kr.co.cheonhajangsa.preview;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.FilterInputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** Thin native shell. The complete Next.js static export is bundled inside this APK. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "http://localhost:4310";
    private static final int LOCATION_REQUEST = 210;
    private WebView web;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(247, 249, 246));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                if (isAppUrl(Uri.parse(url))) reportSmokeStatus(3);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                android.util.Log.w("CheonNet", "resource_error=" + error.getErrorCode() + " host=" + request.getUrl().getHost());
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                android.util.Log.w("CheonNet", "http_status=" + response.getStatusCode() + " host=" + request.getUrl().getHost());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("http".equals(url.getScheme()) && isMapStaticHost(url.getHost()) && "GET".equals(request.getMethod())) {
                    return loadSecureMapAsset(request);
                }
                if (!isAppUrl(url)) return null;
                if (!"GET".equals(request.getMethod())) return errorResponse(405, "Method Not Allowed");
                String path = url.getPath();
                if (path == null || path.length() == 0 || path.equals("/")) path = "/index.html";
                if (path.indexOf('\\') >= 0 || path.indexOf('\0') >= 0) return errorResponse(403, "Forbidden");
                for (String segment : path.split("/")) {
                    if (segment.equals("..") || segment.equals(".")) return errorResponse(403, "Forbidden");
                }
                if (path.endsWith("/")) path += "index.html";
                try {
                    InputStream stream = getAssets().open("web" + path);
                    Map<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-cache");
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(mime(path), "UTF-8", 200, "OK", headers, stream);
                } catch (IOException missing) { return errorResponse(404, "Not Found"); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri target = request.getUrl();
                if (isAppUrl(target)) return false;
                if (!request.isForMainFrame()) return false;
                String scheme = target.getScheme();
                if ("https".equals(scheme) || "http".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, target)); } catch (android.content.ActivityNotFoundException ignored) { }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!isAppUrl(Uri.parse(origin))) { callback.invoke(origin, false, false); return; }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false); return;
                }
                if (locationCallback != null) locationCallback.invoke(locationOrigin, false, false);
                locationCallback = callback;
                locationOrigin = origin;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_REQUEST);
            }
        });
        setContentView(web);
        web.loadUrl(ORIGIN + "/");
    }

    // Debug-only, read-only health counts. No keys, text input or location values are logged.
    private void reportSmokeStatus(final int remaining) {
        web.postDelayed(() -> {
            if (isFinishing() || isDestroyed()) return;
            web.evaluateJavascript("(function(){return JSON.stringify({pageReady:document.title.indexOf('천하장사')>=0,cards:document.querySelectorAll('[data-vendor-id]').length,markers:document.querySelectorAll('[data-marker-id]').length,kakaoReady:!!document.querySelector('.kakao-canvas.is-ready'),loadedImages:Array.from(document.querySelectorAll('.kakao-canvas img')).filter(function(i){return i.complete&&i.naturalWidth>0;}).length,imageKinds:Array.from(document.querySelectorAll('.kakao-canvas img')).slice(0,2).map(function(i){return new URL(i.src).pathname.split('/').slice(0,4).join('/');}),loadedMapTiles:Array.from(document.querySelectorAll('.kakao-canvas img')).filter(function(i){return (/map_2d|map_skyview/.test(i.src)||i.src.indexOf('/api/v1/tile')>=0)&&i.complete&&i.naturalWidth>0;}).length});})()", result -> {
                android.util.Log.i("CheonSmoke", result);
                if (remaining > 1) reportSmokeStatus(remaining - 1);
            });
        }, 7000);
    }

    private static boolean isMapStaticHost(String host) {
        return host != null && (host.endsWith(".kakaocdn.net") || host.endsWith(".daumcdn.net"));
    }

    /** Upgrade legacy SDK asset URLs to HTTPS without allowing cleartext CDN traffic. */
    private static WebResourceResponse loadSecureMapAsset(WebResourceRequest request) {
        HttpURLConnection connection = null;
        try {
            URL secure = new URL(request.getUrl().buildUpon().scheme("https").build().toString());
            connection = (HttpURLConnection) secure.openConnection();
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(12000);
            connection.setRequestProperty("Accept-Encoding", "identity");
            String referer = request.getRequestHeaders().get("Referer");
            String agent = request.getRequestHeaders().get("User-Agent");
            if (referer != null) connection.setRequestProperty("Referer", referer);
            if (agent != null) connection.setRequestProperty("User-Agent", agent);
            int code = connection.getResponseCode();
            if (code != 200 || !"https".equals(connection.getURL().getProtocol())) {
                connection.disconnect();
                return errorResponse(502, "Map Asset Unavailable");
            }
            String type = connection.getContentType();
            String mimeType = type == null ? "application/octet-stream" : type.split(";")[0].trim();
            Map<String,String> headers = new HashMap<>();
            headers.put("Cache-Control", "public, max-age=86400");
            final HttpURLConnection active = connection;
            InputStream stream = new FilterInputStream(connection.getInputStream()) {
                @Override public void close() throws IOException {
                    try { super.close(); } finally { active.disconnect(); }
                }
            };
            return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, stream);
        } catch (IOException failure) {
            if (connection != null) connection.disconnect();
            return errorResponse(502, "Map Asset Unavailable");
        }
    }

    private static boolean isAppUrl(Uri uri) {
        return "http".equals(uri.getScheme()) && "localhost".equals(uri.getHost()) && uri.getPort() == 4310;
    }
    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".ico")) return "image/x-icon";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".ttf")) return "font/ttf";
        if (path.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
    private static WebResourceResponse errorResponse(int code, String message) {
        return new WebResourceResponse("text/plain", "UTF-8", code, message, null,
            new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8)));
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == LOCATION_REQUEST && locationCallback != null) {
            boolean allowed = false;
            for (int result : results) if (result == PackageManager.PERMISSION_GRANTED) allowed = true;
            locationCallback.invoke(locationOrigin, allowed, false);
            locationCallback = null; locationOrigin = null;
        }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false;})()", handled -> {
            if ("true".equals(handled)) return;
            if (web.canGoBack()) web.goBack(); else MainActivity.super.onBackPressed();
        });
    }
    @Override protected void onDestroy() {
        if (locationCallback != null) locationCallback.invoke(locationOrigin, false, false);
        web.stopLoading(); web.destroy();
        super.onDestroy();
    }
}
