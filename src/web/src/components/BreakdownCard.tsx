import React from "react";

interface BreakdownCardProps {
  title: string;
  items: Array<{ label: string; count: number; color: string }>;
  total: number;
}

const colorClasses: Record<string, string> = {
  blue: "#3b82f6",
  green: "#10b981",
  "muted-green": "#7da87a",
  yellow: "#f59e0b",
  red: "#ef4444",
  purple: "#a855f7",
  orange: "#f97316",
  gray: "#6b7280",
  "light-gray": "#9ca3af",
};

export const BreakdownCard: React.FC<BreakdownCardProps> = ({
  title,
  items,
  total,
}) => {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      {/* Horizontal stacked bar chart */}
      {total > 0 && (
        <div className="flex h-8 rounded-lg overflow-hidden mb-4 border border-gray-300">
          {items.map((item, index) => {
            const percentage = (item.count / total) * 100;
            if (percentage === 0) return null;
            return (
              <div
                key={index}
                className="flex items-center justify-center text-xs text-white font-medium"
                style={{
                  width: `${percentage}%`,
                  backgroundColor:
                    colorClasses[item.color] || colorClasses.blue,
                }}
                title={`${item.label}: ${item.count} (${percentage.toFixed(1)}%)`}
              >
                {percentage > 10 && `${percentage.toFixed(0)}%`}
              </div>
            );
          })}
        </div>
      )}

      {/* Item list */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center">
                <span
                  className="inline-block w-4 h-4 rounded mr-3"
                  style={{
                    backgroundColor:
                      colorClasses[item.color] || colorClasses.blue,
                  }}
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-900 mr-2">
                  {item.count}
                </span>
                <span className="text-sm text-gray-500">
                  ({percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">Total</span>
        <span className="font-bold text-gray-900">{total}</span>
      </div>
    </div>
  );
};
