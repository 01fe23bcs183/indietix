"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@indietix/ui";

const PREDEFINED_KEYS = [
  { key: "home.hero", label: "Homepage Hero", type: "json" as const },
  { key: "home.featured", label: "Featured Events", type: "json" as const },
  {
    key: "home.categories",
    label: "Categories Section",
    type: "json" as const,
  },
  { key: "home.testimonials", label: "Testimonials", type: "json" as const },
  { key: "legal.terms", label: "Terms of Service", type: "rich" as const },
  { key: "legal.privacy", label: "Privacy Policy", type: "rich" as const },
  { key: "faq.items", label: "FAQ Items", type: "json" as const },
];

type Tab = "blocks" | "posts";

export default function CMSPage() {
  const [activeTab, setActiveTab] = useState<Tab>("blocks");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Management</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("blocks")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "blocks"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Content Blocks
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "posts"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Blog Posts
          </button>
        </nav>
      </div>

      {activeTab === "blocks" && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Manage content blocks for the homepage, legal pages, and FAQs.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PREDEFINED_KEYS.map((block) => (
              <Link
                key={block.key}
                href={`/cms/blocks/${encodeURIComponent(block.key)}`}
                className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {block.label}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{block.key}</p>
                <span
                  className={`mt-2 inline-block px-2 py-1 text-xs rounded ${
                    block.type === "rich"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {block.type === "rich" ? "Rich Text" : "JSON"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {activeTab === "posts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Manage blog posts and help center articles.
            </p>
            <Link href="/cms/posts/new">
              <Button>Create New Post</Button>
            </Link>
          </div>
          <PostsList />
        </div>
      )}
    </div>
  );
}

function PostsList() {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 text-center text-gray-500">
        <p>No posts yet. Create your first post to get started.</p>
      </div>
    </div>
  );
}
