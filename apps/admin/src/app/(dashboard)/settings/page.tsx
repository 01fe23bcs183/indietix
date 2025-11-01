"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@indietix/ui";

export default function SettingsPage() {
  const [feeValues, setFeeValues] = useState({
    paymentGateway: 2,
    serverMaintenance: 2,
    platformSupport: 10,
  });

  const [gstValue, setGstValue] = useState(0.18);
  const [cancellationValues, setCancellationValues] = useState({
    cancellationFeeFlat: 50,
    cancellationDeadlineHours: 24,
  });

  const setFeesMutation = trpc.admin.settings.setFees.useMutation({
    onSuccess: () => {
      alert("Fees updated successfully");
    },
  });

  const setGstMutation = trpc.admin.settings.setGstRate.useMutation({
    onSuccess: () => {
      alert("GST rate updated successfully");
    },
  });

  const setCancellationMutation =
    trpc.admin.settings.setCancellationDefaults.useMutation({
      onSuccess: () => {
        alert("Cancellation defaults updated successfully");
      },
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-gray-600">Configure platform-wide settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Gateway Fee (₹)
              </label>
              <input
                type="number"
                value={feeValues.paymentGateway}
                onChange={(e) =>
                  setFeeValues({
                    ...feeValues,
                    paymentGateway: parseFloat(e.target.value),
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Server Maintenance Fee (₹)
              </label>
              <input
                type="number"
                value={feeValues.serverMaintenance}
                onChange={(e) =>
                  setFeeValues({
                    ...feeValues,
                    serverMaintenance: parseFloat(e.target.value),
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Platform Support Fee (₹)
              </label>
              <input
                type="number"
                value={feeValues.platformSupport}
                onChange={(e) =>
                  setFeeValues({
                    ...feeValues,
                    platformSupport: parseFloat(e.target.value),
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <Button onClick={() => setFeesMutation.mutate(feeValues)}>
              Save Fees
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GST Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                GST Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={gstValue * 100}
                onChange={(e) => setGstValue(parseFloat(e.target.value) / 100)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <Button onClick={() => setGstMutation.mutate({ gstRate: gstValue })}>
              Save GST Rate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cancellation Policy Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cancellation Fee (₹)
              </label>
              <input
                type="number"
                value={cancellationValues.cancellationFeeFlat}
                onChange={(e) =>
                  setCancellationValues({
                    ...cancellationValues,
                    cancellationFeeFlat: parseFloat(e.target.value),
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cancellation Deadline (hours before event)
              </label>
              <input
                type="number"
                value={cancellationValues.cancellationDeadlineHours}
                onChange={(e) =>
                  setCancellationValues({
                    ...cancellationValues,
                    cancellationDeadlineHours: parseInt(e.target.value),
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <Button
              onClick={() => setCancellationMutation.mutate(cancellationValues)}
            >
              Save Cancellation Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
