#!/usr/bin/env bash
set -e

echo "Building Android APK for IndieTix Mobile..."

cd "$(dirname "$0")/.."

echo "Running Expo prebuild for Android..."
rm -rf apps/mobile/android
cd apps/mobile
CI=1 npx expo prebuild --platform android

echo "Verifying expo-modules-core paths..."
echo "Checking ../node_modules/expo-modules-core:"
ls -la ../node_modules/expo-modules-core 2>&1 | head -5 || echo "Not found"
echo "Checking ../../node_modules/expo-modules-core:"
ls -la ../../node_modules/expo-modules-core 2>&1 | head -5 || echo "Not found"

echo "Patching settings.gradle for monorepo plugin resolution..."
SETTINGS_FILE="android/settings.gradle"
if [ -f "$SETTINGS_FILE" ]; then
  echo "--- BEFORE PATCH (first 120 lines) ---"
  sed -n '1,120p' "$SETTINGS_FILE"
  
  if ! grep -q "includeBuild.*expo-modules-core" "$SETTINGS_FILE"; then
    echo "Adding expo-modules-core plugin management to settings.gradle..."
    cat > /tmp/gradle-patch.txt << 'EOF'
pluginManagement {
    def expoModulesCorePath = new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim()).getParentFile()
    logger.quiet("Expo modules core resolved to: ${expoModulesCorePath}")
    includeBuild(expoModulesCorePath)
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}

EOF
    cat /tmp/gradle-patch.txt "$SETTINGS_FILE" > /tmp/settings-patched.gradle
    mv /tmp/settings-patched.gradle "$SETTINGS_FILE"
    echo "✓ Patched settings.gradle with expo-modules-core configuration"
    
    echo "--- AFTER PATCH (first 200 lines) ---"
    sed -n '1,200p' "$SETTINGS_FILE"
    
    echo "--- Verifying patch ---"
    grep -nE 'pluginManagement|expo-modules-core|includeBuild' "$SETTINGS_FILE" || echo "No matches found"
  else
    echo "✓ settings.gradle already has expo-modules-core configuration"
  fi
else
  echo "⚠ Warning: settings.gradle not found at $SETTINGS_FILE"
fi

echo "Building debug APK with Gradle..."
cd android
./gradlew assembleDebug

APK_PATH="$(pwd)/app/build/outputs/apk/debug/app-debug.apk"
echo "APK built successfully at: $APK_PATH"
echo "APK_PATH=$APK_PATH" >> "$GITHUB_OUTPUT" || true
