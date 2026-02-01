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
                          item.color === "green"
                            ? "#10b981"
                            : item.color === "red"
                              ? "#ef4444"
                              : item.color === "yellow"
                                ? "#f59e0b"
                                : item.color === "orange"
                                  ? "#f97316"
                                  : item.color === "purple"
                                    ? "#a855f7"
                                    : "#3b82f6",
                      }}
                    />
                  )}
                  {item.label}
                </span>
                <span className="font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
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
