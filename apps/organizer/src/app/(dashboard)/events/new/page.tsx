"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { Button } from "@indietix/ui";

type FormData = {
  title: string;
  description: string;
  category: "MUSIC" | "COMEDY" | "SPORTS" | "TECH" | "FOOD" | "ART" | "OTHER";
  city: string;
  venue: string;
  date: string;
  price: number;
  totalSeats: number;
  imageUrl?: string;
};

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "MUSIC",
    city: "",
    venue: "",
    date: "",
    price: 0,
    totalSeats: 0,
    imageUrl: "",
  });

  const createMutation = trpc.organizer.events.create.useMutation({
    onSuccess: () => {
      router.push("/events");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      date: new Date(formData.date),
      imageUrl: formData.imageUrl || undefined,
    });
  };

  const updateField = (field: keyof FormData, value: string | number) => {
    setFormData({ ...formData, [field]: value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Event</h1>

      <div className="mb-8 flex justify-between">
        {[1, 2, 3, 4, 5].map((s) => (
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
            <h2 className="text-xl font-semibold mb-4">Basics</h2>
            <div>
              <label className="block mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full border rounded px-4 py-2"
                required
                minLength={3}
                maxLength={200}
              />
            </div>
            <div>
              <label className="block mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="w-full border rounded px-4 py-2"
                rows={4}
                required
                minLength={10}
              />
            </div>
            <div>
              <label className="block mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full border rounded px-4 py-2"
                required
              >
                <option value="MUSIC">Music</option>
                <option value="COMEDY">Comedy</option>
                <option value="SPORTS">Sports</option>
                <option value="TECH">Tech</option>
                <option value="FOOD">Food</option>
                <option value="ART">Art</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Schedule</h2>
            <div>
              <label className="block mb-2">Date & Time *</label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => updateField("date", e.target.value)}
                className="w-full border rounded px-4 py-2"
                required
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Venue</h2>
            <div>
              <label className="block mb-2">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="w-full border rounded px-4 py-2"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block mb-2">Venue Address *</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => updateField("venue", e.target.value)}
                className="w-full border rounded px-4 py-2"
                required
                minLength={3}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Pricing & Capacity</h2>
            <div>
              <label className="block mb-2">Price (₹) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => updateField("price", Number(e.target.value))}
                className="w-full border rounded px-4 py-2"
                required
                min={0}
              />
            </div>
            <div>
              <label className="block mb-2">Total Seats *</label>
              <input
                type="number"
                value={formData.totalSeats}
                onChange={(e) => updateField("totalSeats", Number(e.target.value))}
                className="w-full border rounded px-4 py-2"
                required
                min={1}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Media</h2>
            <div>
              <label className="block mb-2">Image URL (optional)</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => updateField("imageUrl", e.target.value)}
                className="w-full border rounded px-4 py-2"
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-sm text-gray-500 mt-2">
                {process.env.NEXT_PUBLIC_CLOUDINARY_URL
                  ? "You can also use the Cloudinary upload widget"
                  : "Paste an image URL or leave blank"}
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
          {step < 5 ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Event"}
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
