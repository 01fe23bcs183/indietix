"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@indietix/ui";
import { RichTextEditor } from "@/components/cms/RichTextEditor";

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(newTitle));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }
    if (!excerpt.trim()) {
      setError("Excerpt is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/cms");
    } catch {
      setError("Failed to create post");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cms" className="text-blue-600 hover:underline text-sm">
            &larr; Back to CMS
          </Link>
          <h1 className="text-2xl font-bold mt-2">Create New Post</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter post title"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Slug
              </label>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="post-url-slug"
              />
              <p className="mt-1 text-sm text-gray-500">
                URL: /blog/{slug || "post-slug"}
              </p>
            </div>

            <div>
              <label
                htmlFor="excerpt"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Excerpt
              </label>
              <textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the post"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <RichTextEditor
                content={body}
                onChange={setBody}
                placeholder="Write your post content here..."
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save as Draft"}
            </Button>
            <Link href="/cms">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Post Settings</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="tags"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tag1, tag2, tag3"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Separate tags with commas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Draft
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Featured Image</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">
                Drag and drop an image or enter a URL
              </p>
              <input
                type="text"
                placeholder="Image URL"
                className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
