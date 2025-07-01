"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AuthSuccessPage() {
  const searchParams = useSearchParams();
  const tauriRedirect = searchParams?.get("tauriRedirect");
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (tauriRedirect && !redirectAttempted) {
      setRedirectAttempted(true);

      const decodedUrl = decodeURIComponent(tauriRedirect);
      console.log("Attempting to redirect to Tauri app:", decodedUrl);

      // Primary redirect attempt
      const attemptRedirect = () => {
        try {
          // Use window.location.assign for better compatibility with deep links
          window.location.assign(decodedUrl);
        } catch (error) {
          console.error("Direct redirect failed:", error);

          // Fallback: try opening in a new tab/window
          try {
            window.open(decodedUrl, "_self");
          } catch (fallbackError) {
            console.error("Fallback redirect failed:", fallbackError);
          }
        }
      };

      // Immediate attempt
      attemptRedirect();

      // Show fallback UI after delay if redirect doesn't work
      const fallbackTimer = setTimeout(() => {
        setShowFallback(true);
      }, 2000); // Reduced from 3000ms for better UX

      // Cleanup timer on unmount
      return () => clearTimeout(fallbackTimer);
    }
  }, [tauriRedirect, redirectAttempted]);

  const handleManualRedirect = () => {
    if (!tauriRedirect) return;

    const decodedUrl = decodeURIComponent(tauriRedirect);

    try {
      // Try assign first (doesn't add to history)
      window.location.assign(decodedUrl);
    } catch (error) {
      console.error("Manual redirect failed:", error);

      // Final fallback: try href (adds to history but more compatible)
      try {
        window.location.href = decodedUrl;
      } catch (finalError) {
        console.error("All redirect methods failed:", finalError);
        alert(
          "Unable to open the desktop app. Please ensure it's installed and running.",
        );
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Authentication Successful!
        </h1>

        <p className="mb-6 text-gray-600">
          {tauriRedirect
            ? showFallback
              ? "If the app didn't open automatically, please ensure your desktop application is running."
              : "Redirecting you back to the application..."
            : "You have been successfully authenticated. You can close this window."}
        </p>

        {tauriRedirect && (
          <div className="space-y-3">
            <button
              onClick={handleManualRedirect}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Open Desktop App
            </button>

            {showFallback && (
              <div className="space-y-2 text-sm text-gray-500">
                <p>If the button above doesn't work:</p>
                <ol className="list-inside list-decimal space-y-1 text-left">
                  <li>Make sure your desktop application is running</li>
                  <li>Check that deep links are enabled in your system</li>
                  <li>Try closing and reopening the desktop app</li>
                </ol>
                <p className="mt-2 text-xs break-words text-gray-400">
                  Deep link:{" "}
                  <code className="rounded bg-gray-100 px-1">
                    {decodeURIComponent(tauriRedirect)}
                  </code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
