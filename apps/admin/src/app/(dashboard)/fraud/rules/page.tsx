"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

type RuleListItem = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  definition: Record<string, unknown>;
  action: "FLAG" | "REJECT" | "REVIEW";
  weight: number;
};

export default function FraudRulesPage() {
  const {
    data: rulesData,
    isLoading,
    refetch,
  } = trpc.admin.fraud.listRules.useQuery();
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const rules = (rulesData ?? []) as unknown as RuleListItem[];

  const createRule = trpc.admin.fraud.createRule.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
    },
  });

  const updateRule = trpc.admin.fraud.updateRule.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteRule = trpc.admin.fraud.deleteRule.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    enabled: true,
    priority: 0,
    action: "FLAG" as "FLAG" | "REJECT" | "REVIEW",
    weight: 10,
    definitionType: "velocity_ip",
    threshold: 5,
    lastMinutes: 10,
    minPrice: 5000,
    maxSignupAgeDays: 7,
  });

  const handleCreate = () => {
    const definition: Record<string, unknown> = {
      type: formData.definitionType,
    };

    if (
      formData.definitionType.includes("velocity") ||
      formData.definitionType === "repeated_failed_payments"
    ) {
      definition.threshold = formData.threshold;
      definition.last_minutes = formData.lastMinutes;
    } else if (formData.definitionType === "qty_threshold") {
      definition.threshold = formData.threshold;
    } else if (formData.definitionType === "high_value_new_user") {
      definition.min_price = formData.minPrice;
      definition.max_signup_age_days = formData.maxSignupAgeDays;
    }

    createRule.mutate({
      name: formData.name,
      enabled: formData.enabled,
      priority: formData.priority,
      definition,
      action: formData.action,
      weight: formData.weight,
    });
  };

  const handleToggleEnabled = (id: string, currentEnabled: boolean) => {
    updateRule.mutate({
      id,
      enabled: !currentEnabled,
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this rule?")) {
      deleteRule.mutate({ id });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading rules...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fraud Rules</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showCreateForm ? "Cancel" : "Create Rule"}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-bold">Create New Rule</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Rule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., High velocity from single IP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rule Type</label>
            <select
              value={formData.definitionType}
              onChange={(e) =>
                setFormData({ ...formData, definitionType: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="velocity_ip">Velocity - IP</option>
              <option value="velocity_user">Velocity - User</option>
              <option value="email_domain_blacklist">
                Email Domain Blacklist
              </option>
              <option value="phone_prefix_blacklist">
                Phone Prefix Blacklist
              </option>
              <option value="ip_blacklist">IP Blacklist</option>
              <option value="qty_threshold">Quantity Threshold</option>
              <option value="high_value_new_user">High Value New User</option>
              <option value="repeated_failed_payments">
                Repeated Failed Payments
              </option>
            </select>
          </div>

          {(formData.definitionType.includes("velocity") ||
            formData.definitionType === "repeated_failed_payments") && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Threshold (attempts)
                </label>
                <input
                  type="number"
                  value={formData.threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      threshold: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Time Window (minutes)
                </label>
                <input
                  type="number"
                  value={formData.lastMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastMinutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </>
          )}

          {formData.definitionType === "qty_threshold" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Quantity Threshold
              </label>
              <input
                type="number"
                value={formData.threshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    threshold: parseInt(e.target.value),
                  })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}

          {formData.definitionType === "high_value_new_user" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Price (paise)
                </label>
                <input
                  type="number"
                  value={formData.minPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minPrice: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Signup Age (days)
                </label>
                <input
                  type="number"
                  value={formData.maxSignupAgeDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxSignupAgeDays: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <select
              value={formData.action}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  action: e.target.value as "FLAG" | "REJECT" | "REVIEW",
                })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="FLAG">FLAG - Annotate only</option>
              <option value="REVIEW">REVIEW - Manual review required</option>
              <option value="REJECT">REJECT - Block booking</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Weight (risk score)
            </label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) =>
                setFormData({ ...formData, weight: parseInt(e.target.value) })
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
              className="mr-2"
            />
            <label className="text-sm font-medium">Enabled</label>
          </div>

          <button
            onClick={handleCreate}
            disabled={!formData.name || createRule.isLoading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {createRule.isLoading ? "Creating..." : "Create Rule"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Weight
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rules?.map((rule) => (
              <tr key={rule.id}>
                <td className="px-6 py-4 whitespace-nowrap">{rule.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {(rule.definition as { type?: string })?.type || "unknown"}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      rule.action === "REJECT"
                        ? "bg-red-100 text-red-800"
                        : rule.action === "REVIEW"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {rule.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{rule.weight}</td>
                <td className="px-6 py-4 whitespace-nowrap">{rule.priority}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleEnabled(rule.id, rule.enabled)}
                    className={`px-3 py-1 text-xs rounded ${
                      rule.enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
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
