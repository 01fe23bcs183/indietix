"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@indietix/ui";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "invalid">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const processUnsubscribe = async () => {
      try {
        const response = await fetch("/api/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Failed to process unsubscribe request");
        }
      } catch {
        setStatus("error");
        setErrorMessage("An unexpected error occurred");
      }
    };

    processUnsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900">Processing...</h1>
            <p className="text-gray-500 mt-2">Please wait while we update your preferences.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unsubscribed Successfully</h1>
            <p className="text-gray-600 mb-6">
              You have been unsubscribed from marketing communications. You will still receive
              transactional emails about your bookings and account.
            </p>
            <a href="/">
              <Button>Return to Home</Button>
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <a href="/">
              <Button variant="outline">Return to Home</Button>
            </a>
          </>
        )}

        {status === "invalid" && (
          <>
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-gray-600 mb-6">
              This unsubscribe link is invalid or has expired. Please contact support if you need
              assistance managing your email preferences.
            </p>
            <a href="/">
              <Button variant="outline">Return to Home</Button>
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900">Loading...</h1>
          </div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
