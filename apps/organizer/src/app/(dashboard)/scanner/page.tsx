"use client";

import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { SignedTicket } from "@indietix/utils";

interface ScanResult {
  ok: boolean;
  name?: string;
  email?: string;
  seats?: number;
  ticketNumber?: string;
  eventTitle?: string;
  error?: string;
  attendedAt?: string;
}

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualSearch, setManualSearch] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>("");

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    setDeviceInfo(`${platform} - ${userAgent.substring(0, 100)}`);

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setCameraError(null);
      setResult(null);

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await handleScan(decodedText);
          await stopScanning();
        },
        () => {}
      );

      setScanning(true);
    } catch (error) {
      console.error("Failed to start scanner:", error);
      setCameraError(
        "Failed to access camera. Please ensure camera permissions are granted."
      );
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      setScanning(false);
    } catch (error) {
      console.error("Failed to stop scanner:", error);
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      const ticket: SignedTicket = JSON.parse(qrData);

      if (!ticket.payload || !ticket.signature) {
        setResult({
          ok: false,
          error: "Invalid QR code format",
        });
        playErrorSound();
        return;
      }

      const response = await fetch("/api/checkin/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: ticket.payload,
          signature: ticket.signature,
          deviceInfo,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setResult({
          ok: true,
          name: data.name,
          email: data.email,
          seats: data.seats,
          ticketNumber: data.ticketNumber,
          eventTitle: data.eventTitle,
        });
        playSuccessSound();
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      } else {
        setResult({
          ok: false,
          error: data.error || "Verification failed",
          attendedAt: data.attendedAt,
        });
        playErrorSound();
        if (navigator.vibrate) {
          navigator.vibrate(500);
        }
      }
    } catch (error) {
      console.error("Scan error:", error);
      setResult({
        ok: false,
        error: "Failed to process QR code",
      });
      playErrorSound();
    }
  };

  const handleManualSearch = async () => {
    if (!manualSearch.trim()) return;

    try {
      const response = await fetch(`/api/tickets/${manualSearch.trim()}`);

      if (!response.ok) {
        const errorData = await response.json();
        setResult({
          ok: false,
          error: errorData.error || "Booking not found",
        });
        return;
      }

      const data = await response.json();
      await handleScan(
        JSON.stringify({ payload: data.payload, signature: data.signature })
      );
    } catch (error) {
      console.error("Manual search error:", error);
      setResult({
        ok: false,
        error: "Failed to search booking",
      });
    }
  };

  const playSuccessSound = () => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const playErrorSound = () => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 300;
    oscillator.type = "sawtooth";
    gainNode.gain.value = 0.3;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const resetScanner = () => {
    setResult(null);
    setManualSearch("");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Check-in Scanner</h1>
            <p className="text-purple-100">Scan attendee tickets for entry</p>
          </div>

          <div className="p-6">
            {!result && (
              <>
                <div className="mb-6">
                  <div
                    id="qr-reader"
                    className="border-4 border-gray-300 rounded-lg overflow-hidden"
                    style={{ minHeight: scanning ? "300px" : "0px" }}
                  ></div>

                  {cameraError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800">{cameraError}</p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-4">
                    {!scanning ? (
                      <button
                        onClick={startScanning}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                      >
                        Start Camera Scanner
                      </button>
                    ) : (
                      <button
                        onClick={stopScanning}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                      >
                        Stop Scanner
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Manual Search (Fallback)
                  </h2>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      placeholder="Enter Booking ID or Ticket Number"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleManualSearch();
                        }
                      }}
                    />
                    <button
                      onClick={handleManualSearch}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </>
            )}

            {result && (
              <div className="space-y-6">
                {result.ok ? (
                  <div className="bg-green-50 border-4 border-green-500 rounded-lg p-6">
                    <div className="flex items-center justify-center mb-4">
                      <svg
                        className="w-16 h-16 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-green-800 text-center mb-4">
                      Valid Ticket - Entry Granted
                    </h2>
                    <div className="space-y-2 text-center">
                      <p className="text-lg">
                        <strong>Name:</strong> {result.name}
                      </p>
                      <p className="text-lg">
                        <strong>Email:</strong> {result.email}
                      </p>
                      <p className="text-lg">
                        <strong>Seats:</strong> {result.seats}
                      </p>
                      <p className="text-sm text-gray-600">
                        Ticket: {result.ticketNumber}
                      </p>
                      {result.eventTitle && (
                        <p className="text-sm text-gray-600">
                          Event: {result.eventTitle}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border-4 border-red-500 rounded-lg p-6">
                    <div className="flex items-center justify-center mb-4">
                      <svg
                        className="w-16 h-16 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-red-800 text-center mb-4">
                      Invalid Ticket - Entry Denied
                    </h2>
                    <p className="text-lg text-center text-red-700">
                      {result.error}
                    </p>
                    {result.attendedAt && (
                      <p className="text-sm text-center text-red-600 mt-2">
                        Already checked in at:{" "}
                        {new Date(result.attendedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={resetScanner}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Scan Next Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
