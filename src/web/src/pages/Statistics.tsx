import React, { useCallback, useEffect, useState } from "react";
import { StatisticsResponse } from "../types/statistics";
import { fetchStatistics } from "../api/client";
import { StatisticCard } from "../components/StatisticCard";
import { FunnelStep } from "../components/FunnelStep";

export function Statistics(): React.ReactElement {
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStatistics();
      setStatistics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load statistics",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Dataset Statistics
          </h1>
          <button
            onClick={loadStatistics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {loading && !statistics ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          statistics && (
            <div className="flex gap-6">
              {/* Left: Dataset Processing Funnel */}
              <section className="flex-1">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Dataset Processing Funnel
                </h2>
                <div>
                  {/* Step 1: Indexed to Downloaded */}
                  <FunnelStep
                    title="Step 1: Downloaded"
                    count={statistics.downloadStatus.completed}
                    total={statistics.totalDatasets}
                    percentage={statistics.percentages.downloadedOfIndexed}
                    color="blue"
                    breakdown={[
                      {
                        label: "Successfully downloaded",
                        count: statistics.downloadStatus.completed,
                        color: "blue",
                      },
                      {
                        label: "Failed downloads",
                        count: statistics.downloadStatus.failed,
                        color: "red",
                      },
                      {
                        label: "Not yet started",
                        count: statistics.downloadStatus.notStarted,
                        color: "gray",
                      },
                      {
                        label: "In progress",
                        count: statistics.downloadStatus.inProgress,
                        color: "light-gray",
                      },
                      {
                        label: "Skipped",
                        count: statistics.downloadStatus.skipped,
                        color: "dark-gray",
                      },
                    ]}
                  />

                  {/* Step 2: Downloaded to Analyzed */}
                  <FunnelStep
                    title="Step 2: Analyzed"
                    count={statistics.analysisStatus.analyzed}
                    total={statistics.downloadStatus.completed}
                    percentage={statistics.percentages.analyzedOfDownloaded}
                    color="blue"
                    breakdown={[
                      {
                        label: "Flagged for review",
                        count:
                          statistics.analysisStatus.breakdown.flagged +
                          statistics.analysisStatus.breakdown.reviewedByAi +
                          statistics.analysisStatus.breakdown.pdfReviewedByAi,
                        color: "blue",
                      },
                      {
                        label: "Not flagged (clean)",
                        count: statistics.analysisStatus.breakdown.notFlagged,
                        color: "muted-green",
                      },
                      {
                        label: "Analysis failed",
                        count: statistics.analysisStatus.failed,
                        color: "red",
                      },
                      {
                        label: "Not yet analyzed",
                        count: statistics.analysisStatus.notAnalyzed,
                        color: "gray",
                      },
                    ]}
                  />

                  {/* Step 3: Found suspicious by AI */}
                  <FunnelStep
                    title="Step 3: Found suspicious by AI"
                    count={statistics.aiReviewStatus.breakdown.suspicious}
                    total={
                      statistics.analysisStatus.breakdown.flagged +
                      statistics.analysisStatus.breakdown.reviewedByAi +
                      statistics.analysisStatus.breakdown.pdfReviewedByAi
                    }
                    percentage={statistics.percentages.aiReviewedOfAnalyzed}
                    color="blue"
                    breakdown={[
                      {
                        label: "Datasets with suspicious findings (>50%)",
                        count: statistics.aiReviewStatus.breakdown.suspicious,
                        color: "blue",
                      },
                      {
                        label: "Datasets with no suspicious findings",
                        count:
                          statistics.aiReviewStatus.breakdown.notSuspicious,
                        color: "muted-green",
                      },
                    ]}
                  />

                  {/* Step 4: Found high impact in PDF */}
                  <FunnelStep
                    title="Step 4: Found high impact in PDF"
                    count={statistics.pdfPipeline.pdfReviewedHighImpact}
                    total={statistics.aiReviewStatus.breakdown.suspicious}
                    percentage={statistics.percentages.pdfReviewedOfSuspicious}
                    color="blue"
                    breakdown={[
                      {
                        label: "PDF reviewed - high impact (score ≥ 3)",
                        count: statistics.pdfPipeline.pdfReviewedHighImpact,
                        color: "blue",
                      },
                      {
                        label: "PDF reviewed - low impact (score ≤ 2)",
                        count: statistics.pdfPipeline.pdfReviewedLowImpact,
                        color: "muted-green",
                      },
                      {
                        label: "PDF downloaded but not reviewed",
                        count: statistics.pdfPipeline.pdfDownloadedNotReviewed,
                        color: "gray",
                      },
                      {
                        label: "PDF not yet downloaded",
                        count: statistics.pdfPipeline.pdfNotDownloaded,
                        color: "light-gray",
                      },
                      {
                        label: "Suspicious datasets without articles",
                        count: statistics.pdfPipeline.suspiciousWithoutArticles,
                        color: "dark-gray",
                      },
                    ]}
                  />

                  {/* Step 5: Confirmed by a human */}
                  <FunnelStep
                    title="Step 5: Confirmed by a human"
                    count={statistics.humanReviewStatus.truePositiveHighImpact}
                    total={statistics.pdfPipeline.pdfReviewedHighImpact}
                    percentage={
                      statistics.percentages.humanConfirmedOfHighImpact
                    }
                    color="blue"
                    breakdown={[
                      {
                        label: "True positive - high impact",
                        count:
                          statistics.humanReviewStatus.truePositiveHighImpact,
                        color: "blue",
                      },
                      {
                        label: "True positive - low impact",
                        count:
                          statistics.humanReviewStatus.truePositiveLowImpact,
                        color: "light-blue",
                      },
                      {
                        label: "Ambiguous",
                        count: statistics.humanReviewStatus.ambiguous,
                        color: "gray",
                      },
                      {
                        label: "False positive",
                        count: statistics.humanReviewStatus.falsePositive,
                        color: "muted-green",
                      },
                      {
                        label: "Not yet reviewed",
                        count: statistics.humanReviewStatus.notReviewed,
                        color: "light-gray",
                      },
                    ]}
                  />
                </div>
              </section>

              {/* Right: Overview Cards */}
              <aside className="w-80 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Overview
                </h2>
                <div className="space-y-4">
                  <StatisticCard
                    value={statistics.totalDatasets.toLocaleString()}
                    label="Total Datasets Indexed"
                    color="blue"
                    size="large"
                  />
                  <StatisticCard
                    value={statistics.totalExcelFiles.toLocaleString()}
                    label="Total Excel Files"
                    color="green"
                    size="large"
                  />
                  <StatisticCard
                    value={statistics.totalArticles.toLocaleString()}
                    label="Total Articles Linked"
                    color="purple"
                    size="large"
                  />
                </div>
              </aside>
            </div>
          )
        )}
      </div>
    </div>
  );
}
