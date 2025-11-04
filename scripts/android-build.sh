#!/usr/bin/env bash
set -e

echo "Building Android APK for IndieTix Mobile..."

cd "$(dirname "$0")/.."

echo "Running Expo prebuild for Android..."
rm -rf apps/mobile/android
cd apps/mobile
CI=1 npx expo prebuild --platform android

echo "Creating symlink for expo-modules-core to fix pnpm monorepo plugin resolution..."
CORE_PKG=$(node -e "const path=require('path');const expo=require.resolve('expo/package.json');const core=require.resolve('expo-modules-core/package.json',{paths:[path.dirname(expo)]});process.stdout.write(core);")
CORE_DIR=$(dirname "$CORE_PKG")

echo "Resolved expo-modules-core to: $CORE_DIR"

if [ ! -e "node_modules/expo-modules-core" ]; then
  echo "Creating symlink: node_modules/expo-modules-core -> $CORE_DIR"
  ln -sf "$CORE_DIR" node_modules/expo-modules-core
  echo "✓ Symlink created successfully"
else
  echo "✓ expo-modules-core already exists at node_modules/expo-modules-core"
fi

echo "Building debug APK with Gradle..."
cd android
./gradlew assembleDebug

APK_PATH="$(pwd)/app/build/outputs/apk/debug/app-debug.apk"
echo "APK built successfully at: $APK_PATH"
echo "APK_PATH=$APK_PATH" >> "$GITHUB_OUTPUT" || true
