"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@indietix/ui";

interface Variant {
  name: string;
  weight: number;
}

interface MetricData {
  variant: string;
  weight: number;
  exposures: number;
  conversions: number;
  conversionRate: number;
  clicks: number;
  clickRate: number;
}

export default function ExperimentsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(
    null
  );
  const [newExperiment, setNewExperiment] = useState({
    key: "",
    description: "",
    variants: [
      { name: "A", weight: 50 },
      { name: "B", weight: 50 },
    ] as Variant[],
  });

  const experimentsQuery = trpc.experiments.list.useQuery();
  const metricsQuery = trpc.experiments.metrics.useQuery(
    { key: selectedExperiment ?? "" },
    { enabled: !!selectedExperiment }
  );

  const createMutation = trpc.experiments.create.useMutation({
    onSuccess: () => {
      experimentsQuery.refetch();
      setShowCreateForm(false);
      setNewExperiment({
        key: "",
        description: "",
        variants: [
          { name: "A", weight: 50 },
          { name: "B", weight: 50 },
        ],
      });
    },
  });

  const launchMutation = trpc.experiments.launch.useMutation({
    onSuccess: () => experimentsQuery.refetch(),
  });

  const pauseMutation = trpc.experiments.pause.useMutation({
    onSuccess: () => experimentsQuery.refetch(),
  });

  const stopMutation = trpc.experiments.stop.useMutation({
    onSuccess: () => experimentsQuery.refetch(),
  });

  const deleteMutation = trpc.experiments.delete.useMutation({
    onSuccess: () => {
      experimentsQuery.refetch();
      setSelectedExperiment(null);
    },
  });

  const addVariant = () => {
    const nextLetter = String.fromCharCode(65 + newExperiment.variants.length);
    setNewExperiment({
      ...newExperiment,
      variants: [...newExperiment.variants, { name: nextLetter, weight: 0 }],
    });
  };

  const removeVariant = (index: number) => {
    if (newExperiment.variants.length <= 2) return;
    setNewExperiment({
      ...newExperiment,
      variants: newExperiment.variants.filter((_, i) => i !== index),
    });
  };

  const updateVariant = (
    index: number,
    field: "name" | "weight",
    value: string | number
  ) => {
    const variants = [...newExperiment.variants];
    const currentVariant = variants[index];
    if (!currentVariant) return;
    variants[index] = { ...currentVariant, [field]: value };
    setNewExperiment({ ...newExperiment, variants });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      RUNNING: "bg-green-100 text-green-800",
      PAUSED: "bg-yellow-100 text-yellow-800",
      STOPPED: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.DRAFT}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Experiments</h1>
          <p className="text-gray-600">Manage A/B tests and experiments</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          Create Experiment
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Experiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Experiment Key
                </label>
                <input
                  type="text"
                  value={newExperiment.key}
                  onChange={(e) =>
                    setNewExperiment({ ...newExperiment, key: e.target.value })
                  }
                  placeholder="e.g., new-checkout-flow"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={newExperiment.description}
                  onChange={(e) =>
                    setNewExperiment({
                      ...newExperiment,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the experiment..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variants
                </label>
                {newExperiment.variants.map((variant, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) =>
                        updateVariant(index, "name", e.target.value)
                      }
                      placeholder="Variant name"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                    />
                    <input
                      type="number"
                      value={variant.weight}
                      onChange={(e) =>
                        updateVariant(index, "weight", parseInt(e.target.value))
                      }
                      placeholder="Weight"
                      min={0}
                      max={100}
                      className="w-24 rounded-md border border-gray-300 px-3 py-2"
                    />
                    <span className="py-2 text-gray-500">%</span>
                    {newExperiment.variants.length > 2 && (
                      <Button
                        variant="outline"
                        onClick={() => removeVariant(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addVariant}>
                  Add Variant
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    createMutation.mutate({
                      key: newExperiment.key,
                      description: newExperiment.description,
                      variants: newExperiment.variants,
                    })
                  }
                  disabled={
                    !newExperiment.key || newExperiment.variants.length < 2
                  }
                >
                  Create
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>All Experiments</CardTitle>
          </CardHeader>
          <CardContent>
            {experimentsQuery.isLoading ? (
              <p>Loading...</p>
            ) : experimentsQuery.data?.length === 0 ? (
              <p className="text-gray-500">No experiments yet</p>
            ) : (
              <div className="space-y-3">
                {experimentsQuery.data?.map((exp) => (
                  <div
                    key={exp.key}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedExperiment === exp.key
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedExperiment(exp.key)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{exp.key}</h3>
                        <p className="text-sm text-gray-500">
                          {exp.description || "No description"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {exp._count.assignments} assignments,{" "}
                          {exp._count.exposures} exposures
                        </p>
                      </div>
                      {getStatusBadge(exp.status)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      {exp.status === "DRAFT" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            launchMutation.mutate({ key: exp.key });
                          }}
                        >
                          Launch
                        </Button>
                      )}
                      {exp.status === "RUNNING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseMutation.mutate({ key: exp.key });
                            }}
                          >
                            Pause
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              stopMutation.mutate({ key: exp.key });
                            }}
                          >
                            Stop
                          </Button>
                        </>
                      )}
                      {exp.status === "PAUSED" && (
                        <>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              launchMutation.mutate({ key: exp.key });
                            }}
                          >
                            Resume
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              stopMutation.mutate({ key: exp.key });
                            }}
                          >
                            Stop
                          </Button>
                        </>
                      )}
                      {(exp.status === "DRAFT" || exp.status === "STOPPED") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "Are you sure you want to delete this experiment?"
                              )
                            ) {
                              deleteMutation.mutate({ key: exp.key });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedExperiment && (
          <Card>
            <CardHeader>
              <CardTitle>Metrics: {selectedExperiment}</CardTitle>
            </CardHeader>
            <CardContent>
              {metricsQuery.isLoading ? (
                <p>Loading metrics...</p>
              ) : metricsQuery.data ? (
                <div className="space-y-4">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">Status:</span>
                    {getStatusBadge(metricsQuery.data.status)}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Variant
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Weight
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Exposures
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Conversions
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Conv. Rate
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Clicks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {metricsQuery.data.metrics.map((m: MetricData) => (
                          <tr key={m.variant}>
                            <td className="px-3 py-2 text-sm font-medium">
                              {m.variant}
                            </td>
                            <td className="px-3 py-2 text-sm">{m.weight}%</td>
                            <td className="px-3 py-2 text-sm">{m.exposures}</td>
                            <td className="px-3 py-2 text-sm">
                              {m.conversions}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {m.conversionRate}%
                            </td>
                            <td className="px-3 py-2 text-sm">{m.clicks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {metricsQuery.data.significance && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700">
                        Statistical Significance
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Z-Score: {metricsQuery.data.significance.zScore}
                      </p>
                      <p className="text-sm mt-1">
                        {metricsQuery.data.significance.isSignificant ? (
                          <span className="text-green-600 font-medium">
                            Results are statistically significant (95%
                            confidence)
                          </span>
                        ) : (
                          <span className="text-yellow-600">
                            Results are not yet statistically significant
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No metrics available</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
