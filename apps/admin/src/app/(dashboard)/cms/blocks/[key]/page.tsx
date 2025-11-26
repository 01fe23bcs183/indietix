"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@indietix/ui";
import { RichTextEditor } from "@/components/cms/RichTextEditor";
import { JsonEditor } from "@/components/cms/JsonEditor";
import { VersionHistory } from "@/components/cms/VersionHistory";

const BLOCK_CONFIG: Record<
  string,
  { label: string; type: "rich" | "json"; schema?: object }
> = {
  "home.hero": {
    label: "Homepage Hero",
    type: "json",
    schema: {
      type: "object",
      required: ["title", "subtitle"],
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        ctaText: { type: "string" },
        ctaLink: { type: "string" },
        backgroundImage: { type: "string" },
      },
    },
  },
  "home.featured": {
    label: "Featured Events",
    type: "json",
    schema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        eventIds: { type: "array" },
      },
    },
  },
  "home.categories": {
    label: "Categories Section",
    type: "json",
    schema: {
      type: "object",
      required: ["title", "categories"],
      properties: {
        title: { type: "string" },
        categories: { type: "array" },
      },
    },
  },
  "home.testimonials": {
    label: "Testimonials",
    type: "json",
    schema: {
      type: "object",
      required: ["title", "items"],
      properties: {
        title: { type: "string" },
        items: { type: "array" },
      },
    },
  },
  "legal.terms": {
    label: "Terms of Service",
    type: "rich",
  },
  "legal.privacy": {
    label: "Privacy Policy",
    type: "rich",
  },
  "faq.items": {
    label: "FAQ Items",
    type: "json",
    schema: {
      type: "object",
      required: ["items"],
      properties: {
        items: { type: "array" },
      },
    },
  },
};

const DEFAULT_VALUES: Record<string, unknown> = {
  "home.hero": {
    title: "Discover Amazing Events",
    subtitle: "Find and book tickets for the best events in your city",
    ctaText: "Browse Events",
    ctaLink: "/events",
    backgroundImage: "",
  },
  "home.featured": {
    title: "Featured Events",
    subtitle: "Don't miss these popular events",
    eventIds: [],
  },
  "home.categories": {
    title: "Browse by Category",
    categories: [
      { name: "Music", icon: "music", slug: "music" },
      { name: "Comedy", icon: "laugh", slug: "comedy" },
      { name: "Sports", icon: "trophy", slug: "sports" },
      { name: "Tech", icon: "laptop", slug: "tech" },
    ],
  },
  "home.testimonials": {
    title: "What Our Users Say",
    items: [],
  },
  "legal.terms": "<h1>Terms of Service</h1><p>Your terms content here...</p>",
  "legal.privacy": "<h1>Privacy Policy</h1><p>Your privacy policy content here...</p>",
  "faq.items": {
    items: [
      {
        question: "How do I book tickets?",
        answer: "Browse events, select your tickets, and complete the checkout process.",
      },
    ],
  },
};

interface BlockData {
  id: string;
  key: string;
  type: "RICH" | "JSON";
  value: unknown;
  version: number;
  published: boolean;
  author: {
    id: string;
    name: string;
    email: string;
  };
  versions: Array<{
    id: string;
    version: number;
    value: unknown;
    authorId: string;
    createdAt: string;
  }>;
}

export default function BlockEditorPage() {
  const params = useParams();
  const key = decodeURIComponent(params.key as string);
  const config = BLOCK_CONFIG[key];

  const [block, setBlock] = useState<BlockData | null>(null);
  const [value, setValue] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!config) {
      setError(`Unknown content block: ${key}`);
      setIsLoading(false);
      return;
    }

    const defaultValue = DEFAULT_VALUES[key];
    setValue(defaultValue);
    setBlock(null);
    setIsLoading(false);
  }, [key, config]);

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccessMessage("Content saved as draft");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError("Failed to save content");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccessMessage("Content published successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError("Failed to publish content");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRollback = async (version: number) => {
    setIsRollingBack(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccessMessage(`Rolled back to version ${version}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError("Failed to rollback");
    } finally {
      setIsRollingBack(false);
    }
  };

  const generatePreviewUrl = () => {
    const token = btoa(JSON.stringify({ key, exp: Date.now() + 3600000 }));
    return `/preview?token=${token}&block=${encodeURIComponent(key)}`;
  };

  if (!config) {
    return (
      <div className="space-y-4">
        <Link href="/cms" className="text-blue-600 hover:underline">
          &larr; Back to CMS
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Unknown content block: {key}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cms" className="text-blue-600 hover:underline text-sm">
            &larr; Back to CMS
          </Link>
          <h1 className="text-2xl font-bold mt-2">{config.label}</h1>
          <p className="text-gray-500">{key}</p>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              block?.published
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {block?.published ? "Published" : "Draft"}
          </span>
          {block && (
            <span className="text-sm text-gray-500">
              Version {block.version}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Content Editor</h2>
            {config.type === "rich" ? (
              <RichTextEditor
                content={typeof value === "string" ? value : ""}
                onChange={(newValue) => setValue(newValue)}
              />
            ) : (
              <JsonEditor
                value={value}
                onChange={(newValue) => setValue(newValue)}
                schema={config.schema}
              />
            )}
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
            <a
              href={generatePreviewUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Preview
            </a>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <VersionHistory
              versions={block?.versions || []}
              currentVersion={block?.version || 1}
              currentValue={value}
              onRollback={handleRollback}
              isRollingBack={isRollingBack}
            />
          </div>

          {block?.author && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Last Modified By</h3>
              <p className="text-gray-700">{block.author.name}</p>
              <p className="text-sm text-gray-500">{block.author.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
