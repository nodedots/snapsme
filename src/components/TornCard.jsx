import React from "react";

export const TornCard = ({
  children,
  className = "",
  headerColor = "bg-[#ff5a3c]",
  tornBottom = true,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative bg-[#ffffff] border border-[#d9d4c8] shadow-sm rounded-t-xl overflow-hidden group transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-[#ff5a3c]/60 hover:shadow-md" : ""
      } ${className}`}
    >
      {/* Top accent header strip */}
      <div className={`h-2.5 ${headerColor} w-full`} />

      {/* Main card body */}
      <div className="p-4 relative">{children}</div>

      {/* Simulated jagged torn edge paper effect at bottom */}
      {tornBottom && (
        <div className="w-full h-3 bg-[#ffffff] border-t border-dashed border-[#d9d4c8] flex items-center justify-between px-1 overflow-hidden opacity-90">
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#d9d4c8] to-transparent" />
        </div>
      )}
    </div>
  );
};
