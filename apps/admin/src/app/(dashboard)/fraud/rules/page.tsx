"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";

type FraudRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  action: string;
  weight: number;
};

export default function FraudRulesPage() {
  const { data: rules, isLoading, refetch } = trpc.admin.fraud.listRules.useQuery();
  const updateRule = trpc.admin.fraud.updateRule.useMutation();
  const deleteRule = trpc.admin.fraud.deleteRule.useMutation();

  const handleToggleEnabled = async (ruleId: string, currentEnabled: boolean) => {
    await updateRule.mutateAsync({
      id: ruleId,
      enabled: !currentEnabled,
    });
    refetch();
  };

  const handleDelete = async (ruleId: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      await deleteRule.mutateAsync({ id: ruleId });
      refetch();
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading rules...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fraud Rules</h1>
          <p className="text-gray-600 mt-2">
            Manage fraud detection rules and priorities
          </p>
        </div>
        <Button onClick={() => alert("Rule creation form coming soon")}>Create Rule</Button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
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
          <tbody className="divide-y">
            {rules?.map((rule: FraudRule) => (
              <tr key={rule.id}>
                <td className="px-6 py-4 text-sm font-medium">{rule.name}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      rule.action === "REJECT"
                        ? "bg-red-100 text-red-800"
                        : rule.action === "REVIEW"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {rule.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{rule.weight}</td>
                <td className="px-6 py-4 text-sm">{rule.priority}</td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => handleToggleEnabled(rule.id, rule.enabled)}
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      rule.enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rules?.length && (
          <div className="p-6 text-center text-gray-500">
            No rules configured yet
          </div>
        )}
      </div>
    </div>
  );
}
