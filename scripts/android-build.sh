#!/usr/bin/env bash
set -e

echo "Building Android APK for IndieTix Mobile..."

cd "$(dirname "$0")/.."

echo "Running Expo prebuild for Android..."
rm -rf apps/mobile/android
cd apps/mobile
CI=1 npx expo prebuild --platform android

echo "Patching settings.gradle to add pluginManagement for expo-module-gradle-plugin..."
SETTINGS_FILE="android/settings.gradle"

if ! grep -q "pluginManagement" "$SETTINGS_FILE"; then
  echo "Adding pluginManagement block to settings.gradle..."
  
  cat > /tmp/plugin-management.txt << 'PLUGINMGMT'
pluginManagement {
  def coreAndroidPath = new File(["node", "--print", "const path=require('path');const expo=require.resolve('expo/package.json');const core=require.resolve('expo-modules-core/package.json',{paths:[path.dirname(expo)]});const coreDir=path.dirname(core);path.join(coreDir,'android');"].execute(null, rootDir).text.trim())
  
  includeBuild(coreAndroidPath)
  
  repositories {
    gradlePluginPortal()
    google()
    mavenCentral()
  }
}

PLUGINMGMT
  
  cat /tmp/plugin-management.txt "$SETTINGS_FILE" > /tmp/settings-patched.gradle
  mv /tmp/settings-patched.gradle "$SETTINGS_FILE"
  echo "✓ Added pluginManagement to settings.gradle"
else
  echo "✓ pluginManagement already exists in settings.gradle"
fi

echo "Building debug APK with Gradle..."
cd android
./gradlew assembleDebug

APK_PATH="$(pwd)/app/build/outputs/apk/debug/app-debug.apk"
echo "APK built successfully at: $APK_PATH"
echo "APK_PATH=$APK_PATH" >> "$GITHUB_OUTPUT" || true
