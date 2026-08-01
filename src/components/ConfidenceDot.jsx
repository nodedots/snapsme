import React from "react";

export const ConfidenceDot = ({ score, fieldName, size = "md", showPercent = false }) => {
  if (score === null || score === undefined) return null;

  let color = "bg-amber-400 border-amber-600";
  let label = "Medium AI Confidence";

  if (score >= 0.85) {
    color = "bg-emerald-500 border-emerald-700";
    label = "High AI Confidence";
  } else if (score < 0.70) {
    color = "bg-rose-500 border-rose-700";
    label = "Low AI Confidence - Please verify";
  }

  const sizeClasses = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <span
      className="inline-flex items-center gap-1"
      title={`${fieldName ? fieldName + ": " : ""}${label} (${Math.round(score * 100)}%)`}
    >
      <span className={`${sizeClasses} rounded-full ${color} inline-block animate-pulse shrink-0`} />
      {showPercent && (
        <span className="font-mono text-[10px] text-[#6b665c] font-medium">
          {Math.round(score * 100)}%
        </span>
      )}
    </span>
  );
};
