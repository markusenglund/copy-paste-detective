import React, { useState } from "react";
import { HumanReview } from "../types/dataset";
import { saveHumanReview } from "../api/client";

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
  initialReview: HumanReview | null;
}

export function HumanReviewSection({
  datasetId,
  initialReview,
}: HumanReviewSectionProps): React.ReactElement {
  const [currentReview, setCurrentReview] = useState<HumanReview | null>(
    initialReview,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [formVerdict, setFormVerdict] = useState("");
  const [formImpactScore, setFormImpactScore] = useState(3);
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enterEditMode = (): void => {
    setFormVerdict(currentReview?.verdict ?? "true_positive");
    setFormImpactScore(currentReview?.impactScore ?? 3);
    setFormNotes(currentReview?.notes ?? "");
    setError(null);
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
      });
      setCurrentReview(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing && currentReview) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Human Review</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-semibold">Verdict:</span>{" "}
            <span className={getVerdictClass(currentReview.verdict)}>
              {getVerdictEmoji(currentReview.verdict)}{" "}
              {getVerdictLabel(currentReview.verdict)}
            </span>
          </div>
          <div>
            <span className="font-semibold">Impact Score:</span>{" "}
            <span className={getImpactScoreColor(currentReview.impactScore)}>
              {getImpactScoreLabel(currentReview.impactScore)}
            </span>
          </div>
          {currentReview.notes && (
            <div className="md:col-span-2">
              <span className="font-semibold">Notes:</span>{" "}
              <span className="text-gray-700">{currentReview.notes}</span>
            </div>
          )}
          <div className="md:col-span-2">
            <span className="font-semibold">Last updated:</span>{" "}
            <span className="text-gray-600">
              {new Date(currentReview.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={enterEditMode}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Edit
        </button>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Human Review</h2>
        <p className="text-gray-500">No review yet.</p>
        <button
          onClick={enterEditMode}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Review
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Human Review</h2>
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
