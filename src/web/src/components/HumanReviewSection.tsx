import React, { useState, useEffect, useRef } from "react";
import { HumanReview } from "../types/dataset";
import {
  saveHumanReview,
  fetchProsecutionStatuses,
  createProsecutionStatus,
  fetchTags,
  addTagToDataset,
  removeTagFromDataset,
  ProsecutionStatus,
  TagInfo,
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
  initialTagIds: Set<string>;
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
  initialTagIds,
}: HumanReviewSectionProps): React.ReactElement {
  const { user } = useAuth();
  const canEdit = user?.role === "editor" || user?.role === "admin";
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
  const [allTags, setAllTags] = useState<TagInfo[]>([]);
  const [datasetTagIds, setDatasetTagIds] =
    useState<Set<string>>(initialTagIds);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const tagMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTags().then(setAllTags);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (
        tagMenuRef.current &&
        !tagMenuRef.current.contains(e.target as Node)
      ) {
        setIsTagMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return (): void =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleTag = async (tagId: string): Promise<void> => {
    try {
      const isActive = datasetTagIds.has(tagId);
      const updatedTags = isActive
        ? await removeTagFromDataset(datasetId, tagId)
        : await addTagToDataset(datasetId, tagId);
      setDatasetTagIds(new Set(updatedTags.map((t) => t.id)));
    } catch {
      // silently ignore
    }
  };

  const activeTags = allTags.filter((t) => datasetTagIds.has(t.id));

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
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {activeTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: tag.color + "20",
              color: tag.color,
              border: `1px solid ${tag.color}40`,
            }}
          >
            {tag.name}
            {canEdit && (
              <button
                onClick={() => void handleToggleTag(tag.id)}
                className="ml-1.5 hover:opacity-70"
                style={{ color: tag.color }}
              >
                x
              </button>
            )}
          </span>
        ))}
        {canEdit && (
          <div ref={tagMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsTagMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-full bg-white hover:bg-gray-50 cursor-pointer"
            >
              + Add tag
            </button>
            {isTagMenuOpen && (
              <div className="absolute z-20 mt-1 min-w-[180px] bg-white border border-gray-300 rounded shadow-lg">
                {allTags.map((tag) => {
                  const isActive = datasetTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => void handleToggleTag(tag.id)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1">{tag.name}</span>
                      {isActive && (
                        <svg
                          className="w-4 h-4 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
