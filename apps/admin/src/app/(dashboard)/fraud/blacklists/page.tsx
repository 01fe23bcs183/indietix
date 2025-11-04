"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function FraudBlacklistsPage() {
  const [selectedType, setSelectedType] = useState<
    "EMAIL" | "PHONE" | "IP" | undefined
  >();
  const {
    data: blacklists,
    isLoading,
    refetch,
  } = trpc.admin.fraud.listBlacklists.useQuery(
    selectedType ? { type: selectedType } : undefined
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const addToBlacklist = trpc.admin.fraud.addToBlacklist.useMutation({
    onSuccess: () => {
      refetch();
      setShowAddForm(false);
      setFormData({ type: "EMAIL", value: "", reason: "" });
    },
  });

  const removeFromBlacklist = trpc.admin.fraud.removeFromBlacklist.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const bulkAddToBlacklist = trpc.admin.fraud.bulkAddToBlacklist.useMutation({
    onSuccess: () => {
      refetch();
      setShowBulkImport(false);
      setBulkData({ type: "EMAIL", values: "", reason: "" });
    },
  });

  const [formData, setFormData] = useState({
    type: "EMAIL" as "EMAIL" | "PHONE" | "IP",
    value: "",
    reason: "",
  });

  const [bulkData, setBulkData] = useState({
    type: "EMAIL" as "EMAIL" | "PHONE" | "IP",
    values: "",
    reason: "",
  });

  const handleAdd = () => {
    addToBlacklist.mutate(formData);
  };

  const handleBulkImport = () => {
    const values = bulkData.values
      .split(/[\n,]/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (values.length === 0) {
      window.alert("Please enter at least one value");
      return;
    }

    bulkAddToBlacklist.mutate({
      type: bulkData.type,
      values,
      reason: bulkData.reason || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to remove this entry from the blacklist?"
      )
    ) {
      removeFromBlacklist.mutate({ id });
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(1); // Skip header
      const values = lines
        .map((line) => line.split(",")[0]?.trim())
        .filter((v) => v && v.length > 0);

      setBulkData({ ...bulkData, values: values.join("\n") });
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return <div className="p-6">Loading blacklists...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fraud Blacklists</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            {showBulkImport ? "Cancel" : "Bulk Import"}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showAddForm ? "Cancel" : "Add Entry"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-bold">Add to Blacklist</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as "EMAIL" | "PHONE" | "IP",
                })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="EMAIL">Email Domain</option>
              <option value="PHONE">Phone Prefix</option>
              <option value="IP">IP Address</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Value</label>
            <input
              type="text"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              placeholder={
                formData.type === "EMAIL"
                  ? "example.com"
                  : formData.type === "PHONE"
                    ? "123"
                    : "192.168.1.1"
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              placeholder="Why is this blacklisted?"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!formData.value || addToBlacklist.isLoading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {addToBlacklist.isLoading ? "Adding..." : "Add to Blacklist"}
          </button>
        </div>
      )}

      {showBulkImport && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-bold">Bulk Import</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={bulkData.type}
              onChange={(e) =>
                setBulkData({
                  ...bulkData,
                  type: e.target.value as "EMAIL" | "PHONE" | "IP",
                })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="EMAIL">Email Domains</option>
              <option value="PHONE">Phone Prefixes</option>
              <option value="IP">IP Addresses</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Upload CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              CSV format: value,reason (header row will be skipped)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Values (one per line or comma-separated)
            </label>
            <textarea
              value={bulkData.values}
              onChange={(e) =>
                setBulkData({ ...bulkData, values: e.target.value })
              }
              className="w-full border rounded px-3 py-2 h-32"
              placeholder="example1.com&#10;example2.com&#10;example3.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reason (optional, applies to all)
            </label>
            <input
              type="text"
              value={bulkData.reason}
              onChange={(e) =>
                setBulkData({ ...bulkData, reason: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              placeholder="Why are these blacklisted?"
            />
          </div>

          <button
            onClick={handleBulkImport}
            disabled={!bulkData.values || bulkAddToBlacklist.isLoading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {bulkAddToBlacklist.isLoading ? "Importing..." : "Import All"}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedType(undefined)}
          className={`px-4 py-2 rounded ${!selectedType ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedType("EMAIL")}
          className={`px-4 py-2 rounded ${selectedType === "EMAIL" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Email Domains
        </button>
        <button
          onClick={() => setSelectedType("PHONE")}
          className={`px-4 py-2 rounded ${selectedType === "PHONE" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Phone Prefixes
        </button>
        <button
          onClick={() => setSelectedType("IP")}
          className={`px-4 py-2 rounded ${selectedType === "IP" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          IP Addresses
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {blacklists?.map((entry) => (
              <tr key={entry.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      entry.type === "EMAIL"
                        ? "bg-blue-100 text-blue-800"
                        : entry.type === "PHONE"
                          ? "bg-green-100 text-green-800"
                          : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {entry.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono">
                  {entry.value}
                </td>
                <td className="px-6 py-4">{entry.reason || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
