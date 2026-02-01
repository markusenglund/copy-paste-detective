import React from "react";

interface StatisticCardProps {
  value: number | string;
  label: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "orange";
  size?: "small" | "medium" | "large";
}

const colorClasses = {
  blue: "border-blue-500 bg-blue-50",
  green: "border-green-500 bg-green-50",
  yellow: "border-yellow-500 bg-yellow-50",
  red: "border-red-500 bg-red-50",
  purple: "border-purple-500 bg-purple-50",
  orange: "border-orange-500 bg-orange-50",
};

const sizeClasses = {
  small: "text-2xl",
  medium: "text-3xl",
  large: "text-4xl",
};

export const StatisticCard: React.FC<StatisticCardProps> = ({
  value,
  label,
  color = "blue",
  size = "medium",
}) => {
  return (
    <div
      className={`p-6 rounded-lg border-l-4 ${colorClasses[color]} shadow-sm`}
    >
      <div className={`font-bold ${sizeClasses[size]} mb-2`}>{value}</div>
      <div className="text-gray-700 text-sm font-medium">{label}</div>
    </div>
  );
};
