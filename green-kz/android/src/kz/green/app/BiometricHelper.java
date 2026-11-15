package kz.green.app;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.pm.PackageManager;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;

import java.util.concurrent.Executor;

/**
 * Жүйелік биометрия терезесі (android.hardware.biometrics.BiometricPrompt, Android 9+).
 *
 * Терезені Android өзі салады және саусақ ізін де, бет тануды да қолдана алады:
 * қайсысы ұсынылатынын телефон шешеді (тіркелген биометрия мен өндірушінің баптауларына
 * байланысты). BIOMETRIC_WEAK деңгейі рұқсат етілген — бет тану әдетте осы деңгейде.
 *
 * Бұл класс тек Android 9+ (API 28+) құрылғыларда жүктеледі; ескі нұсқаларда
 * status() бірден -1 қайтарады.
 */
final class BiometricHelper {

    interface Result {
        void done(boolean ok, int code, String message);
    }

    private static final int BIOMETRIC_WEAK = 0x00FF;       // BiometricManager.Authenticators.BIOMETRIC_WEAK
    private static final int ERROR_NO_HARDWARE = 12;        // BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE
    private static final int ERROR_NEGATIVE_BUTTON = 13;    // «Кодты енгізу» батырмасы басылды

    private BiometricHelper() {
    }

    /** 0 — қолдануға дайын; 11 — ештеңе тіркелмеген; 12/1 — жабдық жоқ/қолжетімсіз; -1 — Android 9-дан ескі. */
    static int status(Context c) {
        if (Build.VERSION.SDK_INT < 28) {
            return -1;
        }
        if (Build.VERSION.SDK_INT < 29) {
            // Android 9: BiometricManager жоқ, тек саусақ ізі сканерінің бар-жоғын тексереміз
            return c.getPackageManager().hasSystemFeature(PackageManager.FEATURE_FINGERPRINT) ? 0 : ERROR_NO_HARDWARE;
        }
        BiometricManager m = (BiometricManager) c.getSystemService("biometric"); // Context.BIOMETRIC_SERVICE
        if (m == null) {
            return ERROR_NO_HARDWARE;
        }
        return Build.VERSION.SDK_INT >= 30 ? m.canAuthenticate(BIOMETRIC_WEAK) : m.canAuthenticate();
    }

    /** Терезені көрсетеді. UI ағынынан шақырылуы керек; нәтиже де UI ағынында қайтарылады. */
    static void authenticate(Activity a, String title, String subtitle, String negative, final Result r) {
        if (Build.VERSION.SDK_INT < 28) {
            r.done(false, -1, "");
            return;
        }
        try {
            final Handler main = new Handler(Looper.getMainLooper());
            Executor executor = new Executor() {
                @Override
                public void execute(Runnable command) {
                    main.post(command);
                }
            };
            BiometricPrompt.Builder b = new BiometricPrompt.Builder(a)
                    .setTitle(title)
                    .setNegativeButton(negative, executor, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            r.done(false, ERROR_NEGATIVE_BUTTON, "");
                        }
                    });
            if (subtitle != null && subtitle.length() > 0) {
                b.setSubtitle(subtitle);
            }
            if (Build.VERSION.SDK_INT >= 29) {
                b.setConfirmationRequired(false); // бет танылған бойда бірден кіргізеді
            }
            if (Build.VERSION.SDK_INT >= 30) {
                b.setAllowedAuthenticators(BIOMETRIC_WEAK);
            }
            b.build().authenticate(new CancellationSignal(), executor, new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    r.done(true, 0, "");
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    r.done(false, errorCode, errString == null ? "" : errString.toString());
                }
                // onAuthenticationFailed (танылмады): жүйелік терезе ашық қалады, пайдаланушы қайталайды
            });
        } catch (Throwable t) {
            r.done(false, -2, "");
        }
    }
}
