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
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.util.Locale;

/**
 * Green.kz — веб-қосымшаны (assets/www) толық экранды WebView ішінде ашады.
 *
 * - Жасыл тақырып мөлдір статус-бардың астына дейін созылады (CSS --sat айнымалысы).
 * - Экрандағы пернетақта ашылғанда WebView кішірейеді, енгізу өрістері жабылмайды.
 * - «Артқа» батырмасы алдымен қосымша ішіндегі терезе/экранды жабады.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/www/index.html";
    private static final int BG = 0xFFF0FDF4;

    private FrameLayout root;
    private WebView web;
    private boolean pageReady = false;
    private float topInsetCss = 0f;

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
        s.setDomStorageEnabled(true); // localStorage: баланс, тарих, кредиттер сақталады
        if (s.getTextZoom() > 115) {
            s.setTextZoom(115); // өте үлкен жүйелік қаріп макетті бұзбасын
        }

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
        if (pageReady) {
            web.evaluateJavascript("window.greenSetInset && window.greenSetInset(" + fmt(topInsetCss) + ")", null);
        }
    }

    private static String fmt(float v) {
        return String.format(Locale.US, "%.1f", v);
    }

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
    }

    @Override
    protected void onPause() {
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
