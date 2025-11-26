"use client";

import { useState } from "react";
import { Button } from "@indietix/ui";

interface Version {
  id: string;
  version: number;
  value: unknown;
  authorId: string;
  createdAt: string;
}

interface VersionHistoryProps {
  versions: Version[];
  currentVersion: number;
  currentValue: unknown;
  // eslint-disable-next-line no-unused-vars
  onRollback: (version: number) => void;
  isRollingBack?: boolean;
}

export function VersionHistory({
  versions,
  currentVersion,
  currentValue,
  onRollback,
  isRollingBack,
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const selectedVersionData = versions.find(
    (v) => v.version === selectedVersion
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Version History</h3>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            Current Version: {currentVersion}
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {versions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No previous versions available
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                    selectedVersion === version.version ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedVersion(version.version)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        Version {version.version}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedVersion === version.version && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDiff(!showDiff);
                          }}
                        >
                          {showDiff ? "Hide Diff" : "Show Diff"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRollback(version.version);
                          }}
                          disabled={isRollingBack}
                        >
                          {isRollingBack ? "Rolling back..." : "Rollback"}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showDiff && selectedVersionData && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              Diff: Version {selectedVersion} vs Current
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Version {selectedVersion}
              </h4>
              <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-64">
                {JSON.stringify(selectedVersionData.value, null, 2)}
              </pre>
            </div>
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Current (v{currentVersion})
              </h4>
              <pre className="text-xs bg-green-50 p-2 rounded overflow-auto max-h-64">
                {JSON.stringify(currentValue, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
