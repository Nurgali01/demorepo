#!/usr/bin/env bash
# Green.kz — Android APK жинау (Gradle-сіз, Android Studio-сыз).
#
# Қажет: JDK (javac, keytool) және Ubuntu/Debian пакеттері:
#   sudo apt-get install android-sdk-platform-23 aapt zipalign apksigner dalvik-exchange zip
#
# Қолдану:  bash green-kz/android/build-apk.sh
# Нәтиже:   green-kz/Green-kz.apk
#
# Қол қою кілті репоға кірмейді: ол $HOME/.android/green-kz.jks ішінде жасалады.
# Басқа кілтпен жиналған жаңа нұсқаны орнату үшін ескісін алдымен өшіру керек.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WEB="$(dirname "$HERE")"
OUT="${OUT:-$WEB/Green-kz.apk}"
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
KEYSTORE="${KEYSTORE:-$HOME/.android/green-kz.jks}"
KS_PASS="${KS_PASS:-greenkz-demo}"
B="$HERE/build"

rm -rf "$B"
mkdir -p "$B/assets/www" "$B/classes"

echo "1/5 Веб-файлдарды көшіру"
cp "$WEB/index.html" "$WEB/styles.css" "$WEB/app.js" "$WEB/manifest.webmanifest" "$B/assets/www/"
cp -r "$WEB/icons" "$B/assets/www/"

echo "2/5 Ресурстар мен манифест (aapt2)"
aapt2 compile --dir "$HERE/res" -o "$B/res.zip"
aapt2 link -o "$B/base.apk" -I "$ANDROID_JAR" \
  --manifest "$HERE/AndroidManifest.xml" -A "$B/assets" "$B/res.zip"

echo "3/5 Java → classes.dex"
find "$HERE/src" -name '*.java' > "$B/sources.txt"
javac -source 8 -target 8 -bootclasspath "$ANDROID_JAR" -Xlint:-options \
  -d "$B/classes" @"$B/sources.txt"
dalvik-exchange --dex --min-sdk-version=23 --output="$B/classes.dex" "$B/classes"
(cd "$B" && zip -q base.apk classes.dex)

echo "4/5 Туралау (zipalign)"
zipalign -f -p 4 "$B/base.apk" "$B/aligned.apk"

echo "5/5 Қол қою (apksigner)"
if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -alias greenkz -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Green.kz Demo"
fi
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias greenkz \
  --out "$OUT" "$B/aligned.apk"
apksigner verify "$OUT"
rm -f "$OUT.idsig"

echo "Дайын: $OUT ($(du -h "$OUT" | cut -f1))"
