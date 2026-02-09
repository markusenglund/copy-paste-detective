import React from "react";

interface FunnelStepProps {
  title: string;
  count: number;
  total: number;
  percentage: number;
  color: string;
  breakdown?: Array<{ label: string; count: number; color?: string }>;
}

const colorClasses: Record<string, string> = {
  blue: "border-blue-500 bg-blue-50",
  green: "border-green-500 bg-green-50",
  yellow: "border-yellow-500 bg-yellow-50",
  red: "border-red-500 bg-red-50",
  purple: "border-purple-500 bg-purple-50",
  orange: "border-orange-500 bg-orange-50",
  gray: "border-gray-500 bg-gray-50",
};

const barColorClasses: Record<string, string> = {
  blue: "#3b82f6",
  "light-blue": "#93c5fd",
  green: "#10b981",
  "muted-green": "#7da87a",
  yellow: "#f59e0b",
  red: "#ef4444",
  purple: "#a855f7",
  orange: "#f97316",
  gray: "#6b7280",
  "light-gray": "#9ca3af",
  "dark-gray": "#4b5563",
};

export const FunnelStep: React.FC<FunnelStepProps> = ({
  title,
  count,
  total,
  percentage,
  color,
  breakdown,
}) => {
  return (
    <div className="mb-6">
      <div
        className={`p-6 rounded-lg border-l-4 ${colorClasses[color] || colorClasses.blue} shadow-sm`}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            {total > 0 && (
              <div className="text-sm text-gray-600">
                {percentage}% of {total}
              </div>
            )}
          </div>
        </div>

        {breakdown && breakdown.length > 0 && (
          <>
            {/* Horizontal stacked bar chart */}
            {total > 0 && (
              <div className="flex h-8 rounded-lg overflow-hidden mb-4 border border-gray-300">
                {breakdown.map((item, index) => {
                  const percentage = (item.count / total) * 100;
                  if (percentage === 0) return null;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-center text-xs text-white font-medium"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          barColorClasses[item.color || "blue"] ||
                          barColorClasses.blue,
                      }}
                      title={`${item.label}: ${item.count} (${percentage.toFixed(1)}%)`}
                    >
                      {percentage > 10 && `${percentage.toFixed(0)}%`}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 space-y-2 border-t pt-3">
              {breakdown.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700">
                    {item.color && (
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor:
                            barColorClasses[item.color] || barColorClasses.blue,
                        }}
                      />
                    )}
                    {item.label}
                  </span>
                  <span className="font-medium text-gray-900">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Arrow connector */}
      <div className="flex justify-center my-2">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </div>
  );
};
