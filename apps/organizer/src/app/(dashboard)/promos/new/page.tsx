"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { Button } from "@indietix/ui";

type FormData = {
  code: string;
  type: "PERCENT" | "FLAT";
  value: number;
  startAt?: string;
  endAt?: string;
  usageLimit?: number;
  perUserLimit?: number;
  minPrice?: number;
  applicableEvents?: string[];
  applicableCategories?: string[];
  applicableCities?: string[];
};

export default function NewPromoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    code: "",
    type: "PERCENT",
    value: 0,
  });

  const createMutation = trpc.promos.create.useMutation({
    onSuccess: () => {
      router.push("/promos");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      startAt: formData.startAt ? new Date(formData.startAt) : undefined,
      endAt: formData.endAt ? new Date(formData.endAt) : undefined,
      usageLimit: formData.usageLimit || undefined,
      perUserLimit: formData.perUserLimit || undefined,
      minPrice: formData.minPrice || undefined,
      applicableEvents: formData.applicableEvents?.length
        ? formData.applicableEvents
        : undefined,
      applicableCategories: formData.applicableCategories?.length
        ? formData.applicableCategories
        : undefined,
      applicableCities: formData.applicableCities?.length
        ? formData.applicableCities
        : undefined,
    });
  };

  const updateField = (
    field: keyof FormData,
    value: string | number | string[] | undefined
  ) => {
    setFormData({ ...formData, [field]: value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Promo Code</h1>

      <div className="mb-8 flex justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 mx-1 rounded ${
              s <= step ? "bg-blue-500" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Basic Details</h2>
            <div>
              <label className="block mb-2">Promo Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  updateField("code", e.target.value.toUpperCase())
                }
                className="w-full border rounded px-4 py-2 font-mono"
                required
                minLength={3}
                maxLength={50}
                pattern="[A-Z0-9]+"
                placeholder="SUMMER2025"
              />
              <p className="text-sm text-gray-500 mt-1">
                Use uppercase letters and numbers only (e.g., SUMMER2025,
                SAVE20)
              </p>
            </div>
            <div>
              <label className="block mb-2">Discount Type *</label>
              <select
                value={formData.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="w-full border rounded px-4 py-2"
                required
              >
                <option value="PERCENT">Percentage (e.g., 20%)</option>
                <option value="FLAT">Flat Amount (e.g., ₹50)</option>
              </select>
            </div>
            <div>
              <label className="block mb-2">
                {formData.type === "PERCENT"
                  ? "Discount Percentage *"
                  : "Discount Amount (₹) *"}
              </label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => updateField("value", Number(e.target.value))}
                className="w-full border rounded px-4 py-2"
                required
                min={formData.type === "PERCENT" ? 1 : 0}
                max={formData.type === "PERCENT" ? 100 : undefined}
                step={formData.type === "PERCENT" ? 1 : 100}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.type === "PERCENT"
                  ? "Enter a percentage between 1 and 100"
                  : "Enter the discount amount in rupees"}
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Validity Period</h2>
            <div>
              <label className="block mb-2">Start Date (optional)</label>
              <input
                type="datetime-local"
                value={formData.startAt || ""}
                onChange={(e) => updateField("startAt", e.target.value)}
                className="w-full border rounded px-4 py-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank for immediate activation
              </p>
            </div>
            <div>
              <label className="block mb-2">End Date (optional)</label>
              <input
                type="datetime-local"
                value={formData.endAt || ""}
                onChange={(e) => updateField("endAt", e.target.value)}
                className="w-full border rounded px-4 py-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank for no expiry
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Usage Limits</h2>
            <div>
              <label className="block mb-2">Total Usage Limit (optional)</label>
              <input
                type="number"
                value={formData.usageLimit || ""}
                onChange={(e) =>
                  updateField(
                    "usageLimit",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full border rounded px-4 py-2"
                min={1}
                placeholder="e.g., 100"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum number of times this code can be used across all users
              </p>
            </div>
            <div>
              <label className="block mb-2">Per User Limit (optional)</label>
              <input
                type="number"
                value={formData.perUserLimit || ""}
                onChange={(e) =>
                  updateField(
                    "perUserLimit",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full border rounded px-4 py-2"
                min={1}
                placeholder="e.g., 1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum number of times a single user can use this code
              </p>
            </div>
            <div>
              <label className="block mb-2">
                Minimum Purchase Amount (₹) (optional)
              </label>
              <input
                type="number"
                value={formData.minPrice || ""}
                onChange={(e) =>
                  updateField(
                    "minPrice",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full border rounded px-4 py-2"
                min={0}
                step={100}
                placeholder="e.g., 500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum ticket price required to use this code
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              Applicability (optional)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Leave all fields blank to make this code applicable to all events
            </p>
            <div>
              <label className="block mb-2">Applicable Categories</label>
              <div className="space-y-2">
                {[
                  "MUSIC",
                  "COMEDY",
                  "SPORTS",
                  "TECH",
                  "FOOD",
                  "ART",
                  "OTHER",
                ].map((cat) => (
                  <label key={cat} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        formData.applicableCategories?.includes(cat) || false
                      }
                      onChange={(e) => {
                        const current = formData.applicableCategories || [];
                        if (e.target.checked) {
                          updateField("applicableCategories", [
                            ...current,
                            cat,
                          ]);
                        } else {
                          updateField(
                            "applicableCategories",
                            current.filter((c) => c !== cat)
                          );
                        }
                      }}
                      className="mr-2"
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2">
                Applicable Cities (comma-separated)
              </label>
              <input
                type="text"
                value={formData.applicableCities?.join(", ") || ""}
                onChange={(e) => {
                  const cities = e.target.value
                    .split(",")
                    .map((c) => c.trim())
                    .filter((c) => c);
                  updateField(
                    "applicableCities",
                    cities.length ? cities : undefined
                  );
                }}
                className="w-full border rounded px-4 py-2"
                placeholder="e.g., Bengaluru, Mumbai, Delhi"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank to apply to all cities
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            variant="outline"
          >
            Previous
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Promo Code"}
            </Button>
          )}
        </div>

        {createMutation.error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            Error: {createMutation.error.message}
          </div>
        )}
      </form>
    </div>
  );
}
