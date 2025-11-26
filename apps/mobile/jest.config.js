module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((?:\\.pnpm/[^/]+/node_modules/)?(" +
      [
        "(jest-)?react-native",
        "@react-native",
        "@react-native/.*",
        "@react-native-community/.*",
        "@react-native/js-polyfills",
        "react-native",
        "react-native-.*",
        "react-navigation",
        "@react-navigation/.*",
        "expo(nent)?",
        "expo-.*",
        "@expo/.*",
        "@expo-google-fonts/.*",
        "@unimodules/.*",
        "unimodules",
        "sentry-expo",
        "native-base",
        "react-native-svg",
      ].join("|") +
      ")))",
  ],
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  testEnvironment: "node",
};
