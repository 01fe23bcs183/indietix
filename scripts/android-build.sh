#!/usr/bin/env bash
set -e

echo "Building Android APK for IndieTix Mobile..."

cd "$(dirname "$0")/.."

echo "Running Expo prebuild for Android..."
rm -rf apps/mobile/android
cd apps/mobile
CI=1 npx expo prebuild --platform android

echo "Patching settings.gradle for monorepo plugin resolution..."
SETTINGS_FILE="android/settings.gradle"
if [ -f "$SETTINGS_FILE" ]; then
  if ! grep -q "expo-modules-core/android" "$SETTINGS_FILE"; then
    echo "Adding expo-modules-core plugin management to settings.gradle..."
    cat > /tmp/gradle-patch.txt << 'EOF'
pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
        maven { url = uri(file("${rootDir}/../node_modules/expo-modules-core/android/maven")) }
        maven { url = uri(file("${rootDir}/../../node_modules/expo-modules-core/android/maven")) }
    }
}

def expoModulesCoreDir = file("${rootDir}/../node_modules/expo-modules-core/android")
if (!expoModulesCoreDir.exists()) {
    expoModulesCoreDir = file("${rootDir}/../../node_modules/expo-modules-core/android")
}
if (expoModulesCoreDir.exists()) {
    includeBuild(expoModulesCoreDir)
}

EOF
    cat /tmp/gradle-patch.txt "$SETTINGS_FILE" > /tmp/settings-patched.gradle
    mv /tmp/settings-patched.gradle "$SETTINGS_FILE"
    echo "✓ Patched settings.gradle with expo-modules-core configuration"
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
