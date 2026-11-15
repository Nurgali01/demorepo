package android.hardware.biometrics;

import android.content.Context;
import android.content.DialogInterface;
import android.os.CancellationSignal;

import java.util.concurrent.Executor;

/**
 * ТЕК КОМПИЛЯЦИЯ ҮШІН (APK-ға кірмейді).
 *
 * build-apk.sh Android 6 (API 23) android.jar файлымен жинайды, ал онда API 28-де қосылған
 * BiometricPrompt жоқ. Бұл stub нағыз кластың қолданылатын әдістерінің дәл сигнатураларын
 * қайталайды (Android 14 framework файлымен javap арқылы салыстырылған); орындалу кезінде
 * телефондағы нағыз класс қолданылады.
 */
public class BiometricPrompt {

    BiometricPrompt() {
    }

    public void authenticate(CancellationSignal cancel, Executor executor, AuthenticationCallback callback) {
        throw new RuntimeException("Stub!");
    }

    public static class Builder {
        public Builder(Context context) {
            throw new RuntimeException("Stub!");
        }

        public Builder setTitle(CharSequence title) {
            throw new RuntimeException("Stub!");
        }

        public Builder setSubtitle(CharSequence subtitle) {
            throw new RuntimeException("Stub!");
        }

        public Builder setNegativeButton(CharSequence text, Executor executor, DialogInterface.OnClickListener listener) {
            throw new RuntimeException("Stub!");
        }

        /** API 29+ */
        public Builder setConfirmationRequired(boolean requireConfirmation) {
            throw new RuntimeException("Stub!");
        }

        /** API 30+ */
        public Builder setAllowedAuthenticators(int authenticators) {
            throw new RuntimeException("Stub!");
        }

        public BiometricPrompt build() {
            throw new RuntimeException("Stub!");
        }
    }

    public abstract static class AuthenticationCallback {
        public AuthenticationCallback() {
        }

        public void onAuthenticationError(int errorCode, CharSequence errString) {
        }

        public void onAuthenticationHelp(int helpCode, CharSequence helpString) {
        }

        public void onAuthenticationSucceeded(AuthenticationResult result) {
        }

        public void onAuthenticationFailed() {
        }
    }

    public static class AuthenticationResult {
        AuthenticationResult() {
        }
    }
}
