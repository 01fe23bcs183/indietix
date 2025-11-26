"use client";

import { useState, useEffect } from "react";

interface JsonEditorProps {
  value: unknown;
  onChange: (value: unknown) => void;
  schema?: object;
}

export function JsonEditor({ value, onChange, schema }: JsonEditorProps) {
  const [jsonString, setJsonString] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setJsonString(JSON.stringify(value, null, 2));
      setError(null);
    } catch {
      setError("Invalid JSON value");
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    setJsonString(newValue);
    try {
      const parsed = JSON.parse(newValue);
      setError(null);

      if (schema) {
        const validationError = validateSchema(parsed, schema);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      onChange(parsed);
    } catch {
      setError("Invalid JSON syntax");
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        className={`w-full h-96 font-mono text-sm p-4 border rounded-lg focus:outline-none focus:ring-2 ${
          error
            ? "border-red-300 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        }`}
        spellCheck={false}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function validateSchema(data: unknown, schema: object): string | null {
  if (!schema || typeof schema !== "object") return null;

  const schemaObj = schema as { type?: string; required?: string[]; properties?: Record<string, unknown> };

  if (schemaObj.type === "object" && typeof data !== "object") {
    return "Expected an object";
  }

  if (schemaObj.type === "array" && !Array.isArray(data)) {
    return "Expected an array";
  }

  if (schemaObj.required && Array.isArray(schemaObj.required) && typeof data === "object" && data !== null) {
    for (const field of schemaObj.required) {
      if (!(field in data)) {
        return `Missing required field: ${field}`;
      }
    }
  }

  return null;
}
