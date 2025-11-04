#!/usr/bin/env bash
set -e

echo "Building Android APK for IndieTix Mobile..."

cd "$(dirname "$0")/.."

echo "Running Expo prebuild for Android..."
rm -rf apps/mobile/android
cd apps/mobile
CI=1 npx expo prebuild --platform android

echo "Patching modules that use expo-module-gradle-plugin..."
SETTINGS_FILE="android/settings.gradle"

if grep -q "expo-modules-core.*android" "$SETTINGS_FILE"; then
  echo "Removing previous includeBuild(coreAndroidPath) from settings.gradle"
  awk '
    BEGIN{skip=0}
    /pluginManagement[[:space:]]*{/ {depth=1; skip=1}
    {
      if (skip) {
        n1=gsub(/{/,"{"); n2=gsub(/}/,"}");
        depth+=n1; depth-=n2;
        if (depth==0){ skip=0; next }
        next
      }
      print
    }
  ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
fi

if ! grep -q "^pluginManagement" "$SETTINGS_FILE"; then
  cat > /tmp/pm-repos.gradle <<'PM'
pluginManagement {
  repositories {
    gradlePluginPortal()
    google()
    mavenCentral()
  }
}
PM
  cat /tmp/pm-repos.gradle "$SETTINGS_FILE" > "$SETTINGS_FILE.patched" && mv "$SETTINGS_FILE.patched" "$SETTINGS_FILE"
  echo "✓ Added pluginManagement repositories to settings.gradle"
fi

PATCH_FILES=$(find ../../node_modules/.pnpm -path "*/node_modules/*/android/build.gradle" -print0 2>/dev/null | xargs -0 grep -l "id[[:space:]]*'expo-module-gradle-plugin'" 2>/dev/null || true)

if [ -n "$PATCH_FILES" ]; then
  SNIPPET='apply from: new File(["node", "--print", "require.resolve('\''expo-modules-core/package.json'\'', { paths: [require.resolve('\''expo/package.json'\'')] })"].execute(null, rootDir).text.trim(), "../android/ExpoModulesCorePlugin.gradle")
applyKotlinExpoModulesCorePlugin()
'
  while IFS= read -r f; do
    echo " - Patching $f"
    if grep -q "ExpoModulesCorePlugin.gradle" "$f"; then
      echo "   ✓ already patched"
      continue
    fi
    sed -i "/id[[:space:]]*'expo-module-gradle-plugin'/d" "$f"
    awk -v s="$SNIPPET" '
      BEGIN{in_plugins=0; depth=0; inserted=0}
      {
        if (in_plugins) {
          oc=gsub(/{/,"{"); cc=gsub(/}/,"}");
          depth+=oc; depth-=cc;
          print
          if (depth==0 && !inserted) { print s; inserted=1; in_plugins=0; next }
          next
        }
        print
        if ($0 ~ /^[[:space:]]*plugins[[:space:]]*{[[:space:]]*$/ && !inserted) { in_plugins=1; depth=1 }
      }
      END{ if (!inserted) { print s } }
    ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
    if grep -q "applyKotlinExpoModulesCorePlugin" "$f"; then
      echo "   ✓ patch applied"
    else
      echo "   ✗ patch verification failed"
    fi
  done <<< "$PATCH_FILES"
else
  echo "No modules found using expo-module-gradle-plugin. Nothing to patch."
fi

echo "Building debug APK with Gradle..."
cd android
./gradlew assembleDebug

APK_PATH="$(pwd)/app/build/outputs/apk/debug/app-debug.apk"
echo "APK built successfully at: $APK_PATH"
echo "APK_PATH=$APK_PATH" >> "$GITHUB_OUTPUT" || true
