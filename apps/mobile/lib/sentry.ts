import * as Sentry from "@sentry/react-native";

export function initializeSentry(): void {
  try {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || "";

    if (!dsn || dsn === "") {
      console.log("Sentry: No DSN provided, skipping initialization");
      return;
    }

    Sentry.init({
      dsn,
      enableInExpoDevelopment: false,
      debug: __DEV__,
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV || "development",
    });

    console.log("Sentry initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Sentry:", error);
  }
}

export function captureException(error: Error, context?: Record<string, any>): void {
  try {
    if (context) {
      Sentry.setContext("additional_context", context);
    }
    Sentry.captureException(error);
  } catch (err) {
    console.error("Failed to capture exception:", err);
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  try {
    Sentry.captureMessage(message, level);
  } catch (error) {
    console.error("Failed to capture message:", error);
  }
}

export function setUser(userId: string, email?: string, username?: string): void {
  try {
    Sentry.setUser({ id: userId, email, username });
  } catch (error) {
    console.error("Failed to set user:", error);
  }
}

export function clearUser(): void {
  try {
    Sentry.setUser(null);
  } catch (error) {
    console.error("Failed to clear user:", error);
  }
}
