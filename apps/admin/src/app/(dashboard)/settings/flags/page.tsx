"use client";

import { useState } from "react";
import { trpc } from "../../../../lib/trpc";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@indietix/ui";

interface TargetingRules {
  roles?: string[];
  cities?: string[];
  categories?: string[];
  allowList?: string[];
  denyList?: string[];
}

interface FlagData {
  key: string;
  description: string | null;
  enabled: boolean;
  rollout: number;
  rules: unknown;
}

const CRITICAL_FLAGS = [
  { key: "booking.enabled", description: "Enable/disable all bookings" },
  { key: "checkout.new_ui", description: "New checkout UI" },
  { key: "payments.razorpay", description: "Razorpay payment processing" },
  { key: "discover.enabled", description: "Discover feed feature" },
];

const ROLES = ["CUSTOMER", "ORGANIZER", "ADMIN"];
const CATEGORIES = ["MUSIC", "COMEDY", "SPORTS", "TECH", "FOOD", "ART", "OTHER"];

export default function FlagsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [newFlag, setNewFlag] = useState({
    key: "",
    description: "",
    enabled: false,
    rollout: 100,
    rules: {
      roles: [] as string[],
      cities: [] as string[],
      categories: [] as string[],
      allowList: [] as string[],
      denyList: [] as string[],
    },
  });
  const [cityInput, setCityInput] = useState("");
  const [allowListInput, setAllowListInput] = useState("");
  const [denyListInput, setDenyListInput] = useState("");

  const flagsQuery = trpc.flags.list.useQuery();

  const setFlagMutation = trpc.flags.set.useMutation({
    onSuccess: () => {
      flagsQuery.refetch();
      setShowCreateForm(false);
      setEditingFlag(null);
      resetForm();
    },
  });

  const deleteFlagMutation = trpc.flags.delete.useMutation({
    onSuccess: () => flagsQuery.refetch(),
  });

  const resetForm = () => {
    setNewFlag({
      key: "",
      description: "",
      enabled: false,
      rollout: 100,
      rules: {
        roles: [],
        cities: [],
        categories: [],
        allowList: [],
        denyList: [],
      },
    });
    setCityInput("");
    setAllowListInput("");
    setDenyListInput("");
  };

  const startEditing = (flag: {
    key: string;
    description: string | null;
    enabled: boolean;
    rollout: number;
    rules: unknown;
  }) => {
    const rules = (flag.rules as TargetingRules) || {};
    setNewFlag({
      key: flag.key,
      description: flag.description || "",
      enabled: flag.enabled,
      rollout: flag.rollout,
      rules: {
        roles: rules.roles || [],
        cities: rules.cities || [],
        categories: rules.categories || [],
        allowList: rules.allowList || [],
        denyList: rules.denyList || [],
      },
    });
    setEditingFlag(flag.key);
    setShowCreateForm(true);
  };

  const toggleRole = (role: string) => {
    const roles = newFlag.rules.roles.includes(role)
      ? newFlag.rules.roles.filter((r) => r !== role)
      : [...newFlag.rules.roles, role];
    setNewFlag({ ...newFlag, rules: { ...newFlag.rules, roles } });
  };

  const toggleCategory = (category: string) => {
    const categories = newFlag.rules.categories.includes(category)
      ? newFlag.rules.categories.filter((c) => c !== category)
      : [...newFlag.rules.categories, category];
    setNewFlag({ ...newFlag, rules: { ...newFlag.rules, categories } });
  };

  const addCity = () => {
    if (cityInput && !newFlag.rules.cities.includes(cityInput)) {
      setNewFlag({
        ...newFlag,
        rules: { ...newFlag.rules, cities: [...newFlag.rules.cities, cityInput] },
      });
      setCityInput("");
    }
  };

  const removeCity = (city: string) => {
    setNewFlag({
      ...newFlag,
      rules: {
        ...newFlag.rules,
        cities: newFlag.rules.cities.filter((c) => c !== city),
      },
    });
  };

  const addToAllowList = () => {
    if (allowListInput && !newFlag.rules.allowList.includes(allowListInput)) {
      setNewFlag({
        ...newFlag,
        rules: {
          ...newFlag.rules,
          allowList: [...newFlag.rules.allowList, allowListInput],
        },
      });
      setAllowListInput("");
    }
  };

  const removeFromAllowList = (userId: string) => {
    setNewFlag({
      ...newFlag,
      rules: {
        ...newFlag.rules,
        allowList: newFlag.rules.allowList.filter((u) => u !== userId),
      },
    });
  };

  const addToDenyList = () => {
    if (denyListInput && !newFlag.rules.denyList.includes(denyListInput)) {
      setNewFlag({
        ...newFlag,
        rules: {
          ...newFlag.rules,
          denyList: [...newFlag.rules.denyList, denyListInput],
        },
      });
      setDenyListInput("");
    }
  };

  const removeFromDenyList = (userId: string) => {
    setNewFlag({
      ...newFlag,
      rules: {
        ...newFlag.rules,
        denyList: newFlag.rules.denyList.filter((u) => u !== userId),
      },
    });
  };

  const saveFlag = () => {
    const rules =
      newFlag.rules.roles.length > 0 ||
      newFlag.rules.cities.length > 0 ||
      newFlag.rules.categories.length > 0 ||
      newFlag.rules.allowList.length > 0 ||
      newFlag.rules.denyList.length > 0
        ? newFlag.rules
        : null;

    setFlagMutation.mutate({
      key: newFlag.key,
      description: newFlag.description || undefined,
      enabled: newFlag.enabled,
      rollout: newFlag.rollout,
      rules,
    });
  };

  const quickToggle = (key: string, enabled: boolean) => {
    setFlagMutation.mutate({ key, enabled });
  };

  const updateRollout = (key: string, rollout: number) => {
    setFlagMutation.mutate({ key, rollout });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-gray-600">
            Manage feature flags and kill-switches
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingFlag(null);
            setShowCreateForm(true);
          }}
        >
          Create Flag
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kill Switches (Critical Features)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            These flags control critical platform features. Toggle with caution.
          </p>
          <div className="space-y-3">
            {CRITICAL_FLAGS.map((criticalFlag) => {
              const existingFlag = flagsQuery.data?.find(
                (f) => f.key === criticalFlag.key
              );
              const isEnabled = existingFlag?.enabled ?? false;

              return (
                <div
                  key={criticalFlag.key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{criticalFlag.key}</span>
                    <p className="text-sm text-gray-500">
                      {criticalFlag.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm ${isEnabled ? "text-green-600" : "text-red-600"}`}
                    >
                      {isEnabled ? "ON" : "OFF"}
                    </span>
                    <button
                      onClick={() =>
                        quickToggle(criticalFlag.key, !isEnabled)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingFlag ? `Edit Flag: ${editingFlag}` : "Create New Flag"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Flag Key
                </label>
                <input
                  type="text"
                  value={newFlag.key}
                  onChange={(e) =>
                    setNewFlag({ ...newFlag, key: e.target.value })
                  }
                  placeholder="e.g., feature.new_checkout"
                  disabled={!!editingFlag}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={newFlag.description}
                  onChange={(e) =>
                    setNewFlag({ ...newFlag, description: e.target.value })
                  }
                  placeholder="Describe the flag..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={newFlag.enabled}
                    onChange={(e) =>
                      setNewFlag({ ...newFlag, enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="enabled" className="text-sm font-medium">
                    Enabled
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rollout Percentage: {newFlag.rollout}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={newFlag.rollout}
                  onChange={(e) =>
                    setNewFlag({ ...newFlag, rollout: parseInt(e.target.value) })
                  }
                  className="mt-1 block w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Targeting Rules
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Target Roles
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((role) => (
                        <button
                          key={role}
                          onClick={() => toggleRole(role)}
                          className={`px-3 py-1 rounded-full text-sm ${
                            newFlag.rules.roles.includes(role)
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Target Categories
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((category) => (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`px-3 py-1 rounded-full text-sm ${
                            newFlag.rules.categories.includes(category)
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Target Cities
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        placeholder="Add city..."
                        className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && addCity()}
                      />
                      <Button size="sm" onClick={addCity}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {newFlag.rules.cities.map((city) => (
                        <span
                          key={city}
                          className="px-2 py-1 bg-gray-100 rounded text-sm flex items-center gap-1"
                        >
                          {city}
                          <button
                            onClick={() => removeCity(city)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Allow List (User IDs)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={allowListInput}
                        onChange={(e) => setAllowListInput(e.target.value)}
                        placeholder="Add user ID..."
                        className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && addToAllowList()}
                      />
                      <Button size="sm" onClick={addToAllowList}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {newFlag.rules.allowList.map((userId) => (
                        <span
                          key={userId}
                          className="px-2 py-1 bg-green-100 rounded text-sm flex items-center gap-1"
                        >
                          {userId}
                          <button
                            onClick={() => removeFromAllowList(userId)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Deny List (User IDs)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={denyListInput}
                        onChange={(e) => setDenyListInput(e.target.value)}
                        placeholder="Add user ID..."
                        className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && addToDenyList()}
                      />
                      <Button size="sm" onClick={addToDenyList}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {newFlag.rules.denyList.map((userId) => (
                        <span
                          key={userId}
                          className="px-2 py-1 bg-red-100 rounded text-sm flex items-center gap-1"
                        >
                          {userId}
                          <button
                            onClick={() => removeFromDenyList(userId)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveFlag} disabled={!newFlag.key}>
                  {editingFlag ? "Update" : "Create"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingFlag(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          {flagsQuery.isLoading ? (
            <p>Loading...</p>
          ) : flagsQuery.data?.length === 0 ? (
            <p className="text-gray-500">No feature flags yet</p>
          ) : (
            <div className="space-y-3">
              {flagsQuery.data?.map((flag) => (
                <div
                  key={flag.key}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{flag.key}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            flag.enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {flag.enabled ? "ON" : "OFF"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {flag.description || "No description"}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span>Rollout: {flag.rollout}%</span>
                        {flag.rules && (
                          <span className="text-blue-600">Has targeting rules</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 mr-4">
                        <span className="text-xs text-gray-500">Rollout:</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={flag.rollout}
                          onChange={(e) =>
                            updateRollout(flag.key, parseInt(e.target.value))
                          }
                          className="w-24"
                        />
                        <span className="text-xs w-8">{flag.rollout}%</span>
                      </div>
                      <button
                        onClick={() => quickToggle(flag.key, !flag.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          flag.enabled ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            flag.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(flag as FlagData)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this flag?"
                            )
                          ) {
                            deleteFlagMutation.mutate({ key: flag.key });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
