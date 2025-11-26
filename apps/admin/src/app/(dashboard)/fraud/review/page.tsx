"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

type CaseListItem = {
  id: string;
  status: "OPEN" | "APPROVED" | "REJECTED";
  createdAt: string | Date;
  booking: {
    event: {
      title: string;
    };
    user: {
      name: string | null;
      email: string;
    };
  };
};

export default function FraudReviewQueuePage() {
  const [selectedStatus, setSelectedStatus] = useState<
    "OPEN" | "APPROVED" | "REJECTED" | undefined
  >("OPEN");
  const {
    data: casesData,
    isLoading,
    refetch,
  } = trpc.admin.fraud.listCases.useQuery(
    selectedStatus ? { status: selectedStatus } : undefined
  );

  const cases = (casesData ?? []) as unknown as CaseListItem[];

  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const { data: caseDetailData } = trpc.admin.fraud.getCase.useQuery(
    { id: selectedCase! },
    { enabled: !!selectedCase }
  );

  const caseDetail = caseDetailData as unknown as
    | {
        id: string;
        status: "OPEN" | "APPROVED" | "REJECTED";
        createdAt: string | Date;
        resolvedAt: string | Date | null;
        booking: {
          event: {
            title: string;
            price: number;
            date: string | Date;
          };
          user: {
            name: string | null;
            email: string;
            phone: string | null;
          };
          bookingAttempts: Array<{
            id: string;
            ip: string | null;
            emailDomain: string | null;
            phonePrefix: string | null;
            qty: number;
            result: string | null;
            createdAt: string | Date;
          }>;
        };
        notes: Array<{
          text: string;
          createdBy: string;
          createdAt: string;
        }>;
      }
    | undefined;

  const resolveCase = trpc.admin.fraud.resolveCase.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedCase(null);
      setResolveNote("");
    },
  });

  const addNote = trpc.admin.fraud.addCaseNote.useMutation({
    onSuccess: () => {
      refetch();
      setNoteText("");
    },
  });

  const [resolveNote, setResolveNote] = useState("");
  const [noteText, setNoteText] = useState("");

  const handleResolve = (status: "APPROVED" | "REJECTED") => {
    if (!selectedCase) return;

    if (
      window.confirm(
        `Are you sure you want to ${status.toLowerCase()} this case?`
      )
    ) {
      resolveCase.mutate({
        id: selectedCase,
        status,
        note: resolveNote || undefined,
      });
    }
  };

  const handleAddNote = () => {
    if (!selectedCase || !noteText) return;

    addNote.mutate({
      id: selectedCase,
      note: noteText,
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading review queue...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Fraud Review Queue</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedStatus("OPEN")}
          className={`px-4 py-2 rounded ${selectedStatus === "OPEN" ? "bg-yellow-500 text-white" : "bg-gray-200"}`}
        >
          Open Cases
        </button>
        <button
          onClick={() => setSelectedStatus("APPROVED")}
          className={`px-4 py-2 rounded ${selectedStatus === "APPROVED" ? "bg-green-500 text-white" : "bg-gray-200"}`}
        >
          Approved
        </button>
        <button
          onClick={() => setSelectedStatus("REJECTED")}
          className={`px-4 py-2 rounded ${selectedStatus === "REJECTED" ? "bg-red-500 text-white" : "bg-gray-200"}`}
        >
          Rejected
        </button>
        <button
          onClick={() => setSelectedStatus(undefined)}
          className={`px-4 py-2 rounded ${!selectedStatus ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          All Cases
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-bold">Cases</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {cases?.map((fraudCase) => (
              <div
                key={fraudCase.id}
                onClick={() => setSelectedCase(fraudCase.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedCase === fraudCase.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">
                      {fraudCase.booking.event.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {fraudCase.booking.user.name} (
                      {fraudCase.booking.user.email})
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      fraudCase.status === "OPEN"
                        ? "bg-yellow-100 text-yellow-800"
                        : fraudCase.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {fraudCase.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Created: {new Date(fraudCase.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {cases?.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No cases found
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {selectedCase && caseDetail ? (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4">Case Details</h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Status
                    </label>
                    <p className="text-lg">
                      <span
                        className={`px-3 py-1 rounded ${
                          caseDetail.status === "OPEN"
                            ? "bg-yellow-100 text-yellow-800"
                            : caseDetail.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {caseDetail.status}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Event
                    </label>
                    <p className="text-lg">{caseDetail.booking.event.title}</p>
                    <p className="text-sm text-gray-600">
                      ₹{caseDetail.booking.event.price / 100} •{" "}
                      {new Date(
                        caseDetail.booking.event.date
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      User
                    </label>
                    <p className="text-lg">{caseDetail.booking.user.name}</p>
                    <p className="text-sm text-gray-600">
                      {caseDetail.booking.user.email}
                    </p>
                    {caseDetail.booking.user.phone && (
                      <p className="text-sm text-gray-600">
                        {caseDetail.booking.user.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Booking Attempts
                    </label>
                    <div className="mt-2 space-y-2">
                      {caseDetail.booking.bookingAttempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className="text-sm bg-gray-50 p-2 rounded"
                        >
                          <p>
                            <span className="font-medium">IP:</span>{" "}
                            {attempt.ip || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium">Email Domain:</span>{" "}
                            {attempt.emailDomain || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium">Phone Prefix:</span>{" "}
                            {attempt.phonePrefix || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium">Quantity:</span>{" "}
                            {attempt.qty}
                          </p>
                          <p>
                            <span className="font-medium">Result:</span>{" "}
                            {attempt.result || "pending"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(attempt.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Notes
                    </label>
                    <div className="mt-2 space-y-2">
                      {caseDetail.notes.map((note, idx) => (
                        <div
                          key={idx}
                          className="text-sm bg-gray-50 p-2 rounded"
                        >
                          <p>{note.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {caseDetail.status === "OPEN" && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Add Note
                    </label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full border rounded px-3 py-2 h-20"
                      placeholder="Add investigation notes..."
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!noteText || addNote.isLoading}
                      className="mt-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:bg-gray-300"
                    >
                      {addNote.isLoading ? "Adding..." : "Add Note"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Resolution Note (optional)
                    </label>
                    <textarea
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      className="w-full border rounded px-3 py-2 h-20"
                      placeholder="Add resolution note..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve("APPROVED")}
                      disabled={resolveCase.isLoading}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
                    >
                      {resolveCase.isLoading ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleResolve("REJECTED")}
                      disabled={resolveCase.isLoading}
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-300"
                    >
                      {resolveCase.isLoading ? "Processing..." : "Reject"}
                    </button>
                  </div>
                </div>
              )}

              {caseDetail.status !== "OPEN" && caseDetail.resolvedAt && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Resolved: {new Date(caseDetail.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Select a case to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
