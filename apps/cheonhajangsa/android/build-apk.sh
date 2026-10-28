#!/bin/bash
set -euo pipefail
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
CHEON_ANDROID_DIR="$(cd "$(dirname "$0")" && pwd)"
CHEON_PROJECT_DIR="$(cd "$CHEON_ANDROID_DIR/.." && pwd)"
CHEON_SDK="${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}"
CHEON_JAVA="${CHEON_JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
CHEON_TOOLS="$CHEON_SDK/build-tools/34.0.0"
CHEON_PLATFORM="$CHEON_SDK/platforms/android-34/android.jar"
export JAVA_HOME="$CHEON_JAVA"
export PATH="$CHEON_JAVA/bin:$PATH"
if [[ ! -f "$CHEON_PROJECT_DIR/.next-android/index.html" ]]; then
  echo '먼저 프로젝트에서 pnpm build:android:web를 실행하세요.' >&2; exit 1
fi
mkdir -p "$CHEON_ANDROID_DIR/build" "$CHEON_ANDROID_DIR/dist"
CHEON_BUILD="$(mktemp -d "$CHEON_ANDROID_DIR/build/run.XXXXXX")"
mkdir -p "$CHEON_BUILD/classes" "$CHEON_BUILD/generated" "$CHEON_BUILD/dex" "$CHEON_BUILD/assets"
cp -R "$CHEON_PROJECT_DIR/.next-android" "$CHEON_BUILD/assets/web"
"$CHEON_TOOLS/aapt" package -f -m --ignore-assets '!.git:!.svn:!.DS_Store' -M "$CHEON_ANDROID_DIR/AndroidManifest.xml" -S "$CHEON_ANDROID_DIR/res" -A "$CHEON_BUILD/assets" -I "$CHEON_PLATFORM" -J "$CHEON_BUILD/generated" -F "$CHEON_BUILD/unsigned.apk"
find "$CHEON_ANDROID_DIR/src" "$CHEON_BUILD/generated" -name '*.java' -print > "$CHEON_BUILD/sources.txt"
"$CHEON_JAVA/bin/javac" -J-Dfile.encoding=UTF-8 -encoding UTF-8 -source 8 -target 8 -classpath "$CHEON_PLATFORM" -d "$CHEON_BUILD/classes" @"$CHEON_BUILD/sources.txt"
"$CHEON_JAVA/bin/jar" cf "$CHEON_BUILD/classes.jar" -C "$CHEON_BUILD/classes" .
"$CHEON_TOOLS/d8" --min-api 24 --lib "$CHEON_PLATFORM" --output "$CHEON_BUILD/dex" "$CHEON_BUILD/classes.jar"
python3 - "$CHEON_BUILD/unsigned.apk" "$CHEON_BUILD/dex/classes.dex" <<'PY'
import sys,zipfile
with zipfile.ZipFile(sys.argv[1], 'a', compression=zipfile.ZIP_DEFLATED) as z: z.write(sys.argv[2], 'classes.dex')
PY
"$CHEON_TOOLS/zipalign" -f -p 4 "$CHEON_BUILD/unsigned.apk" "$CHEON_BUILD/aligned.apk"
if [[ ! -f "$CHEON_ANDROID_DIR/build/debug.keystore" ]]; then
 "$CHEON_JAVA/bin/keytool" -genkeypair -noprompt -keystore "$CHEON_ANDROID_DIR/build/debug.keystore" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Android Debug,O=Cheonhajangsa Preview,C=KR' >/dev/null 2>&1
fi
"$CHEON_TOOLS/apksigner" sign --ks "$CHEON_ANDROID_DIR/build/debug.keystore" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$CHEON_ANDROID_DIR/dist/cheonhajangsa-debug.apk" "$CHEON_BUILD/aligned.apk"
"$CHEON_TOOLS/apksigner" verify --verbose "$CHEON_ANDROID_DIR/dist/cheonhajangsa-debug.apk"
python3 - "$CHEON_ANDROID_DIR/dist/cheonhajangsa-debug.apk" <<'PY'
import sys,zipfile,hashlib
from pathlib import Path
p=Path(sys.argv[1])
with zipfile.ZipFile(p) as z:
 names=z.namelist()
 assert 'classes.dex' in names
 assert 'assets/web/index.html' in names
 assert any(n.startswith('assets/web/_next/') and n.endswith('.js') for n in names)
 assert not any('.env' in n for n in names)
print('APK:',p)
print('SIZE:',p.stat().st_size)
print('SHA256:',hashlib.sha256(p.read_bytes()).hexdigest())
PY
