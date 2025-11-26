"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { Button } from "@indietix/ui";
import { useState, useEffect } from "react";

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { data: event, isLoading } = trpc.organizer.events.get.useQuery({
    id: eventId,
  });
  const updateMutation = trpc.organizer.events.update.useMutation({
    onSuccess: () => {
      router.push("/events");
    },
  });

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: "MUSIC" | "COMEDY" | "SPORTS" | "TECH" | "FOOD" | "ART" | "OTHER";
    city: string;
    venue: string;
    date: string;
    price: number;
    totalSeats: number;
    imageUrl: string;
  }>({
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

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description,
        category: event.category,
        city: event.city,
        venue: event.venue,
        date: new Date(event.date).toISOString().slice(0, 16),
        price: event.price,
        totalSeats: event.totalSeats,
        imageUrl: "",
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      id: eventId,
      data: {
        ...formData,
        date: new Date(formData.date),
        imageUrl: formData.imageUrl || undefined,
      },
    });
  };

  const updateField = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
  };

  if (isLoading) {
    return <div className="p-8">Loading event...</div>;
  }

  if (!event) {
    return <div className="p-8">Event not found</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Event</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2 font-semibold">Title *</label>
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
          <label className="block mb-2 font-semibold">Description *</label>
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
          <label className="block mb-2 font-semibold">Category *</label>
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

        <div>
          <label className="block mb-2 font-semibold">Date & Time *</label>
          <input
            type="datetime-local"
            value={formData.date}
            onChange={(e) => updateField("date", e.target.value)}
            className="w-full border rounded px-4 py-2"
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-semibold">City *</label>
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
          <label className="block mb-2 font-semibold">Venue Address *</label>
          <input
            type="text"
            value={formData.venue}
            onChange={(e) => updateField("venue", e.target.value)}
            className="w-full border rounded px-4 py-2"
            required
            minLength={3}
          />
        </div>

        <div>
          <label className="block mb-2 font-semibold">Price (₹) *</label>
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
          <label className="block mb-2 font-semibold">Total Seats *</label>
          <input
            type="number"
            value={formData.totalSeats}
            onChange={(e) => updateField("totalSeats", Number(e.target.value))}
            className="w-full border rounded px-4 py-2"
            required
            min={1}
          />
        </div>

        <div>
          <label className="block mb-2 font-semibold">
            Image URL (optional)
          </label>
          <input
            type="url"
            value={formData.imageUrl}
            onChange={(e) => updateField("imageUrl", e.target.value)}
            className="w-full border rounded px-4 py-2"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/events")}
          >
            Cancel
          </Button>
        </div>

        {updateMutation.error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            Error: {updateMutation.error.message}
          </div>
        )}
      </form>
    </div>
  );
}
