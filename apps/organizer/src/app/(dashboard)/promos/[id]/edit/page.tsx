"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "../../../../../lib/trpc";
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

export default function EditPromoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: promo, isLoading } = trpc.promos.get.useQuery({ id });
  const [formData, setFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (promo) {
      setFormData({
        code: promo.code,
        type: promo.type,
        value: promo.value,
        startAt: promo.startAt
          ? new Date(promo.startAt).toISOString().slice(0, 16)
          : undefined,
        endAt: promo.endAt
          ? new Date(promo.endAt).toISOString().slice(0, 16)
          : undefined,
        usageLimit: promo.usageLimit || undefined,
        perUserLimit: promo.perUserLimit || undefined,
        minPrice: promo.minPrice || undefined,
        applicableEvents: promo.applicableEvents || undefined,
        applicableCategories: promo.applicableCategories || undefined,
        applicableCities: promo.applicableCities || undefined,
      });
    }
  }, [promo]);

  const updateMutation = trpc.promos.update.useMutation({
    onSuccess: () => {
      router.push(`/promos/${id}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    await updateMutation.mutateAsync({
      id,
      code: formData.code,
      type: formData.type,
      value: formData.value,
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
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
  };

  if (isLoading || !formData) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Promo Code</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Basic Details</h2>
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
            />
          </div>
          <div>
            <label className="block mb-2">Discount Type *</label>
            <select
              value={formData.type}
              onChange={(e) => updateField("type", e.target.value)}
              className="w-full border rounded px-4 py-2"
              required
            >
              <option value="PERCENT">Percentage</option>
              <option value="FLAT">Flat Amount</option>
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
            />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Validity Period</h2>
          <div>
            <label className="block mb-2">Start Date</label>
            <input
              type="datetime-local"
              value={formData.startAt || ""}
              onChange={(e) => updateField("startAt", e.target.value)}
              className="w-full border rounded px-4 py-2"
            />
          </div>
          <div>
            <label className="block mb-2">End Date</label>
            <input
              type="datetime-local"
              value={formData.endAt || ""}
              onChange={(e) => updateField("endAt", e.target.value)}
              className="w-full border rounded px-4 py-2"
            />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Usage Limits</h2>
          <div>
            <label className="block mb-2">Total Usage Limit</label>
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
            />
          </div>
          <div>
            <label className="block mb-2">Per User Limit</label>
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
            />
          </div>
          <div>
            <label className="block mb-2">Minimum Purchase Amount (₹)</label>
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
            />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Applicability</h2>
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
                        updateField("applicableCategories", [...current, cat]);
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
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={() => router.push(`/promos/${id}`)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {updateMutation.error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            Error: {updateMutation.error.message}
          </div>
        )}
      </form>
    </div>
  );
}
