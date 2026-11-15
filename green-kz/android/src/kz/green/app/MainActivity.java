package kz.green.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONObject;

import java.util.Locale;

/**
 * Green.kz — веб-қосымшаны (assets/www) толық экранды WebView ішінде ашады.
 *
 * - Жасыл тақырып мөлдір статус-бардың астына дейін созылады (CSS --sat айнымалысы).
 * - Экрандағы пернетақта ашылғанда WebView кішірейеді, енгізу өрістері жабылмайды.
 * - «Артқа» батырмасы алдымен қосымша ішіндегі терезе/экранды жабады.
 * - PDF таңдау: бет ішіндегі input type=file жүйелік файл таңдау терезесін ашады.
 * - Биометрия: бет window.GreenNative арқылы жүйелік саусақ ізі / бет тану терезесін сұрайды.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/www/index.html";
    private static final int BG = 0xFFF0FDF4;
    private static final int REQ_FILE = 1001;

    private FrameLayout root;
    private WebView web;
    private boolean pageReady = false;
    private float topInsetCss = 0f;
    private ValueCallback<Uri[]> fileCallback;
    private String[] pendingBio; // {тақырып, түсіндірме, бас тарту батырмасы} — терезе фокус алғанша күтеді

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        int ui = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
        if (Build.VERSION.SDK_INT >= 26) {
            window.setNavigationBarColor(Color.WHITE);
            ui |= 0x00000010; // View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR (API 26)
        }
        window.getDecorView().setSystemUiVisibility(ui);

        root = new FrameLayout(this);
        root.setBackgroundColor(BG);

        web = new WebView(this);
        web.setBackgroundColor(BG);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // localStorage / IndexedDB: баланс, код хэші, құжаттар
        if (s.getTextZoom() > 115) {
            s.setTextZoom(115); // өте үлкен жүйелік қаріп макетті бұзбасын
        }

        // Бетке тек APK ішіндегі өз файлдарымыз жүктеледі (сыртқы сілтемелер браузерде
        // ашылады), сондықтан көпір бөгде сайттарға қолжетімсіз.
        web.addJavascriptInterface(new Bridge(), "GreenNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file:///android_asset/")) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception ignored) {
                    // сілтемені ашатын қосымша жоқ
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                pushInset();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                // input accept="application/pdf" → тек PDF файлдар көрсетіледі
                String type = "*/*";
                String[] accept = params.getAcceptTypes();
                if (accept != null && accept.length > 0 && accept[0] != null && accept[0].indexOf('/') > 0) {
                    type = accept[0];
                }
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(type);
                try {
                    startActivityForResult(intent, REQ_FILE);
                } catch (Exception e) {
                    // файл таңдайтын қосымша табылмады
                    fileCallback = null;
                    callback.onReceiveValue(null);
                }
                return true;
            }
        });

        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                // Төменгі шегініс = пернетақта (adjustResize) → WebView-ды кішірейтеміз.
                v.setPadding(0, 0, 0, insets.getSystemWindowInsetBottom());
                // Жоғарғы шегініс = статус-бар → бет оны CSS арқылы өзі ескереді.
                float top = insets.getSystemWindowInsetTop() / getResources().getDisplayMetrics().density;
                if (Math.abs(top - topInsetCss) > 0.5f) {
                    topInsetCss = top;
                    pushInset();
                }
                return insets.consumeSystemWindowInsets();
            }
        });

        setContentView(root);

        topInsetCss = statusBarHeightCss();
        web.loadUrl(START_URL + "#app=1&sat=" + fmt(topInsetCss));
    }

    private float statusBarHeightCss() {
        int id = getResources().getIdentifier("status_bar_height", "dimen", "android");
        int px = id > 0 ? getResources().getDimensionPixelSize(id) : 0;
        return px / getResources().getDisplayMetrics().density;
    }

    private void pushInset() {
        js("window.greenSetInset && window.greenSetInset(" + fmt(topInsetCss) + ")");
    }

    /** Бет дайын болса, JS кодын орындайды (тек UI ағынынан шақырылады). */
    private void js(String code) {
        if (pageReady && web != null) {
            web.evaluateJavascript(code, null);
        }
    }

    private static String fmt(float v) {
        return String.format(Locale.US, "%.1f", v);
    }

    // ---------- Файл таңдау нәтижесі ----------

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                fileCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    // ---------- Биометрия көпірі (JS: window.GreenNative) ----------

    /** WebView осы кластың @JavascriptInterface әдістерін JS-тен шақырады, сондықтан ол ашық (public). */
    public final class Bridge {
        /** 0 — дайын; 11 — саусақ ізі/бет тіркелмеген; -1 — қолдау жоқ; басқасы — қолжетімсіз. */
        @JavascriptInterface
        public int bioStatus() {
            try {
                return BiometricHelper.status(MainActivity.this);
            } catch (Throwable t) {
                return -1;
            }
        }

        /** Жүйелік биометрия терезесін көрсетеді; нәтиже window.greenBioResult(ok, code, msg) арқылы келеді. */
        @JavascriptInterface
        public void bioAuth(final String title, final String subtitle, final String negative) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    pendingBio = new String[] {title, subtitle, negative};
                    if (hasWindowFocus()) {
                        startPendingBio();
                    }
                }
            });
        }
    }

    private void startPendingBio() {
        final String[] a = pendingBio;
        pendingBio = null;
        if (a == null) {
            return;
        }
        BiometricHelper.authenticate(this, a[0], a[1], a[2], new BiometricHelper.Result() {
            @Override
            public void done(boolean ok, int code, String message) {
                js("window.greenBioResult && window.greenBioResult(" + ok + "," + code + ","
                        + JSONObject.quote(message == null ? "" : message) + ")");
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && pendingBio != null) {
            startPendingBio();
        }
    }

    // ---------- «Артқа» және өмірлік цикл ----------

    @Override
    public void onBackPressed() {
        if (!pageReady) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript("(window.greenBack && window.greenBack()) ? 'handled' : 'exit'",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (value == null || !value.contains("handled")) {
                            MainActivity.super.onBackPressed();
                        }
                    }
                });
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        // Қосымшаға қайта кіру: 10 секундтан көп өтсе, бет кіру кодын сұрайды
        js("window.greenAppShown && window.greenAppShown()");
    }

    @Override
    protected void onPause() {
        // Қосымшадан шығу уақытын бетке хабарлаймыз
        js("window.greenAppHidden && window.greenAppHidden()");
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
