#!/usr/bin/env bash
set -e

echo "Building Android APK for IndieTix Mobile..."

cd "$(dirname "$0")/.."

echo "Running Expo prebuild for Android..."
rm -rf apps/mobile/android
cd apps/mobile
CI=1 npx expo prebuild --platform android

echo "Patching settings.gradle for pnpm monorepo plugin resolution..."
SETTINGS_FILE="android/settings.gradle"
if [ -f "$SETTINGS_FILE" ]; then
  echo "--- BEFORE PATCH (first 50 lines) ---"
  sed -n '1,50p' "$SETTINGS_FILE"
  
  if ! grep -q "pluginManagement" "$SETTINGS_FILE"; then
    echo "Adding pluginManagement for expo-module-gradle-plugin resolution in pnpm monorepo..."
    
    cat > /tmp/gradle-patch.txt << 'EOF'
pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
    resolutionStrategy {
        eachPlugin {
            if (requested.id.id == 'expo-module-gradle-plugin') {
                // The plugin is provided by expo-modules-core which is included by autolinking
                // We need to resolve it from the pnpm store
                def expoModulesCoreDir
                try {
                    def expoModulesCorePath = new File(["node", "--print", "require.resolve('expo-modules-core/package.json', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
                    expoModulesCoreDir = expoModulesCorePath.getParentFile()
                    logger.quiet("Resolved expo-modules-core for plugin to: ${expoModulesCoreDir}")
                    useModule("expo-modules-core:expo-modules-core:+")
                } catch (Exception e) {
                    logger.warn("Failed to resolve expo-modules-core for plugin: ${e.message}")
                }
            }
        }
    }
}

EOF
    cat /tmp/gradle-patch.txt "$SETTINGS_FILE" > /tmp/settings-patched.gradle
    mv /tmp/settings-patched.gradle "$SETTINGS_FILE"
    echo "✓ Patched settings.gradle with pluginManagement configuration"
    
    echo "--- AFTER PATCH (first 80 lines) ---"
    sed -n '1,80p' "$SETTINGS_FILE"
  else
    echo "✓ settings.gradle already has pluginManagement configuration"
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
