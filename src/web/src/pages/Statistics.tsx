import React, { useCallback, useEffect, useState } from "react";
import { StatisticsResponse } from "../types/statistics";
import { fetchStatistics } from "../api/client";
import { StatisticCard } from "../components/StatisticCard";
import { FunnelStep } from "../components/FunnelStep";
import { BreakdownCard } from "../components/BreakdownCard";

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
            <div className="space-y-8">
              {/* Section 1: Overview Cards */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </section>

              {/* Section 2: Dataset Processing Funnel */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Dataset Processing Funnel
                </h2>
                <div className="max-w-3xl mx-auto">
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
                        color: "green",
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
                        color: "yellow",
                      },
                      {
                        label: "Skipped",
                        count: statistics.downloadStatus.skipped,
                        color: "gray",
                      },
                    ]}
                  />

                  {/* Step 2: Downloaded to Analyzed */}
                  <FunnelStep
                    title="Step 2: Analyzed"
                    count={statistics.analysisStatus.analyzed}
                    total={statistics.downloadStatus.completed}
                    percentage={statistics.percentages.analyzedOfDownloaded}
                    color="green"
                    breakdown={[
                      {
                        label: "Not flagged (clean)",
                        count: statistics.analysisStatus.breakdown.notFlagged,
                        color: "green",
                      },
                      {
                        label: "Flagged for review",
                        count: statistics.analysisStatus.breakdown.flagged,
                        color: "orange",
                      },
                      {
                        label: "Reviewed by AI",
                        count: statistics.analysisStatus.breakdown.reviewedByAi,
                        color: "orange",
                      },
                      {
                        label: "PDF reviewed by AI",
                        count:
                          statistics.analysisStatus.breakdown.pdfReviewedByAi,
                        color: "purple",
                      },
                      {
                        label: "Failed analysis",
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

                  {/* Step 3: Suspicious to PDF Reviewed */}
                  <FunnelStep
                    title="Step 3: Suspicious Datasets Pipeline"
                    count={statistics.suspiciousDatasets.pdfReviewed}
                    total={statistics.suspiciousDatasets.total}
                    percentage={statistics.percentages.pdfReviewedOfFlagged}
                    color="orange"
                    breakdown={[
                      {
                        label: "Total suspicious findings",
                        count: statistics.suspiciousDatasets.total,
                        color: "orange",
                      },
                      {
                        label: "With linked article",
                        count: statistics.suspiciousDatasets.withArticle,
                        color: "blue",
                      },
                      {
                        label: "With PDF downloaded",
                        count: statistics.suspiciousDatasets.withPdf,
                        color: "green",
                      },
                      {
                        label: "PDF reviewed",
                        count: statistics.suspiciousDatasets.pdfReviewed,
                        color: "purple",
                      },
                    ]}
                  />
                </div>
              </section>

              {/* Section 3: Suspicious Datasets Details */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Suspicious Datasets Details
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <StatisticCard
                      value={statistics.suspiciousDatasets.total.toLocaleString()}
                      label="Total Suspicious Findings (>50% probability)"
                      color="orange"
                    />
                    <StatisticCard
                      value={statistics.suspiciousDatasets.pdfReviewed.toLocaleString()}
                      label="PDF Reviews Completed"
                      color="purple"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Article & PDF Availability
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">
                            With linked article
                          </span>
                          <span className="font-semibold">
                            {statistics.suspiciousDatasets.withArticle} (
                            {statistics.suspiciousDatasets.total > 0
                              ? (
                                  (statistics.suspiciousDatasets.withArticle /
                                    statistics.suspiciousDatasets.total) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">
                            With PDF downloaded
                          </span>
                          <span className="font-semibold">
                            {statistics.suspiciousDatasets.withPdf} (
                            {statistics.suspiciousDatasets.total > 0
                              ? (
                                  (statistics.suspiciousDatasets.withPdf /
                                    statistics.suspiciousDatasets.total) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        PDF Review Impact Breakdown
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded border-l-4 border-red-500">
                          <span className="text-sm text-gray-700">
                            High Impact (score ≥ 3)
                          </span>
                          <span className="font-semibold text-red-700">
                            {
                              statistics.suspiciousDatasets.pdfReviewBreakdown
                                .highImpact
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
                          <span className="text-sm text-gray-700">
                            Low Impact (score ≤ 2)
                          </span>
                          <span className="font-semibold text-yellow-700">
                            {
                              statistics.suspiciousDatasets.pdfReviewBreakdown
                                .lowImpact
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Download & Analysis Status Breakdowns */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Detailed Status Breakdowns
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BreakdownCard
                    title="Download Status"
                    total={statistics.totalDatasets}
                    items={[
                      {
                        label: "Completed",
                        count: statistics.downloadStatus.completed,
                        color: "green",
                      },
                      {
                        label: "Failed",
                        count: statistics.downloadStatus.failed,
                        color: "red",
                      },
                      {
                        label: "Not Started",
                        count: statistics.downloadStatus.notStarted,
                        color: "gray",
                      },
                      {
                        label: "In Progress",
                        count: statistics.downloadStatus.inProgress,
                        color: "yellow",
                      },
                      {
                        label: "Skipped",
                        count: statistics.downloadStatus.skipped,
                        color: "gray",
                      },
                    ]}
                  />

                  <BreakdownCard
                    title="Analysis Status (of Downloaded)"
                    total={statistics.downloadStatus.completed}
                    items={[
                      {
                        label: "Not Flagged (Clean)",
                        count: statistics.analysisStatus.breakdown.notFlagged,
                        color: "green",
                      },
                      {
                        label: "Flagged for Review",
                        count: statistics.analysisStatus.breakdown.flagged,
                        color: "orange",
                      },
                      {
                        label: "Reviewed by AI",
                        count: statistics.analysisStatus.breakdown.reviewedByAi,
                        color: "orange",
                      },
                      {
                        label: "PDF Reviewed by AI",
                        count:
                          statistics.analysisStatus.breakdown.pdfReviewedByAi,
                        color: "purple",
                      },
                      {
                        label: "Failed",
                        count: statistics.analysisStatus.failed,
                        color: "red",
                      },
                      {
                        label: "Not Yet Analyzed",
                        count: statistics.analysisStatus.notAnalyzed,
                        color: "gray",
                      },
                    ]}
                  />
                </div>
              </section>
            </div>
          )
        )}
      </div>
    </div>
  );
}
