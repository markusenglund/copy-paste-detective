import React, { useState } from "react";
import { HumanReview } from "../types/dataset";
import {
  saveHumanReview,
  fetchProsecutionStatuses,
  createProsecutionStatus,
  ProsecutionStatus,
} from "../api/client";
import { useAuth } from "../lib/useAuth";

function getVerdictLabel(verdict: string): string {
  if (verdict === "true_positive") return "True Positive";
  if (verdict === "false_positive") return "False Positive";
  if (verdict === "ambiguous") return "Ambiguous";
  return "-";
}

function getVerdictClass(verdict: string): string {
  if (verdict === "true_positive") return "font-bold";
  if (verdict === "false_positive") return "font-semibold";
  if (verdict === "ambiguous") return "font-semibold";
  return "";
}

function getVerdictEmoji(verdict: string): string {
  if (verdict === "true_positive") return "✅";
  if (verdict === "false_positive") return "❌";
  if (verdict === "ambiguous") return "❓";
  return "";
}

function getImpactScoreLabel(score: number | null): string {
  if (score === null) return "-";
  if (score === 5) return "Severe";
  if (score === 4) return "High";
  if (score === 3) return "Medium";
  if (score === 2) return "Low";
  if (score === 1) return "None";
  return "-";
}

function getImpactScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score === 5) return "text-red-600 font-bold";
  if (score === 4) return "text-orange-500 font-semibold";
  if (score === 3) return "text-yellow-600";
  return "text-gray-600";
}

interface HumanReviewSectionProps {
  datasetId: number;
  initialReviews: HumanReview[];
}

function ReviewCard({ review }: { review: HumanReview }): React.ReactElement {
  return (
    <div
      className={`border rounded-lg p-4 ${review.isLatestReview ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-gray-800">
          {review.reviewerUsername}
        </span>
        <div className="flex items-center gap-2">
          {review.isLatestReview && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              Latest
            </span>
          )}
          <span className="text-xs text-gray-500">
            {new Date(review.updatedAt).toISOString().split("T")[0]}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <div>
          <span className={getVerdictClass(review.verdict)}>
            {getVerdictEmoji(review.verdict)} {getVerdictLabel(review.verdict)}
          </span>
        </div>
        <div>
          <span className={getImpactScoreColor(review.impactScore)}>
            {getImpactScoreLabel(review.impactScore)}
          </span>
        </div>
        <div>
          <span className="text-gray-700">{review.caseName ?? "-"}</span>
        </div>
      </div>
      {review.notes && (
        <div className="mt-2 text-sm text-gray-700">{review.notes}</div>
      )}
    </div>
  );
}

export function HumanReviewSection({
  datasetId,
  initialReviews,
}: HumanReviewSectionProps): React.ReactElement {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<HumanReview[]>(initialReviews);
  const [isEditing, setIsEditing] = useState(false);
  const [formVerdict, setFormVerdict] = useState("");
  const [formImpactScore, setFormImpactScore] = useState(3);
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formProsecutionStatusId, setFormProsecutionStatusId] =
    useState("not_started");
  const [prosecutionStatuses, setProsecutionStatuses] = useState<
    ProsecutionStatus[]
  >([]);
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);

  const myReview = reviews.find((r) => r.reviewerUsername === user?.username);

  const enterEditMode = async (): Promise<void> => {
    setFormVerdict(myReview?.verdict ?? "true_positive");
    setFormImpactScore(myReview?.impactScore ?? 3);
    setFormNotes(myReview?.notes ?? "");
    setFormProsecutionStatusId(myReview?.prosecutionStatusId ?? "not_started");
    setIsCreatingStatus(false);
    setNewStatusName("");
    setStatusError(null);
    setError(null);
    try {
      const statuses = await fetchProsecutionStatuses();
      setProsecutionStatuses(statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch statuses");
    }
    setIsEditing(true);
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await saveHumanReview(datasetId, {
        verdict: formVerdict,
        impactScore: formImpactScore,
        notes: formNotes || null,
        prosecutionStatusId: formProsecutionStatusId,
      });
      setReviews((prev) => {
        const withoutMine = prev.map((r) => ({
          ...r,
          isLatestReview: false,
        }));
        const existingIdx = withoutMine.findIndex(
          (r) => r.reviewerUsername === updated.reviewerUsername,
        );
        if (existingIdx >= 0) {
          withoutMine[existingIdx] = updated;
        } else {
          withoutMine.unshift(updated);
        }
        return withoutMine;
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateStatus = async (): Promise<void> => {
    if (!newStatusName.trim()) {
      setStatusError("Status name cannot be empty");
      return;
    }
    try {
      const created = await createProsecutionStatus(newStatusName.trim());
      setProsecutionStatuses((prev) => [...prev, created]);
      setFormProsecutionStatusId(created.id);
      setIsCreatingStatus(false);
      setNewStatusName("");
      setStatusError(null);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Failed to create status",
      );
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">
          {myReview ? "Edit Your Review" : "Add Your Review"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Verdict</label>
            <select
              value={formVerdict}
              onChange={(e) => setFormVerdict(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="true_positive">True Positive</option>
              <option value="false_positive">False Positive</option>
              <option value="ambiguous">Ambiguous</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Impact Score</label>
            <select
              value={formImpactScore}
              onChange={(e) => setFormImpactScore(parseInt(e.target.value, 10))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value={1}>1 - None</option>
              <option value={2}>2 - Low</option>
              <option value={3}>3 - Medium</option>
              <option value={4}>4 - High</option>
              <option value={5}>5 - Severe</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Prosecution Status
            </label>
            <div className="flex gap-2">
              <select
                value={formProsecutionStatusId}
                onChange={(e) => setFormProsecutionStatusId(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {prosecutionStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {!isCreatingStatus && (
                <button
                  onClick={() => {
                    setIsCreatingStatus(true);
                    setNewStatusName("");
                    setStatusError(null);
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  +
                </button>
              )}
            </div>
            {isCreatingStatus && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateStatus();
                    }
                  }}
                  placeholder="New status name"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void handleCreateStatus()}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsCreatingStatus(false);
                    setNewStatusName("");
                    setStatusError(null);
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
            {statusError && (
              <p className="text-red-600 text-sm mt-1">{statusError}</p>
            )}
          </div>
          <div>
            <label className="block font-semibold mb-1">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Human Reviews</h2>
        <button
          onClick={enterEditMode}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {myReview ? "Edit My Review" : "Add Review"}
        </button>
      </div>
      {reviews.length === 0 ? (
        <p className="text-gray-500">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.reviewerUsername} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
