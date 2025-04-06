"use client";

import { useEffect, useState } from "react";
import React from "react";
interface VoteBarProps {
  yesPercentage: number;
  noPercentage: number;
}

export function VoteBar({ yesPercentage, noPercentage }: VoteBarProps) {
  const [yesWidth, setYesWidth] = useState(0);
  const [noWidth, setNoWidth] = useState(0);

  // Smoothly animate the width changes
  useEffect(() => {
    setYesWidth(yesPercentage);
    setNoWidth(noPercentage);
  }, [yesPercentage, noPercentage]);

  return (
    <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden relative flex">
      {/* Yes Votes (Left Side) */}
      <div
        className="h-full bg-green-500 transition-all duration-500 flex items-center justify-start pl-2 text-xs font-bold text-white"
        style={{ width: `${yesWidth}%` }}
      >
        {yesWidth > 10 ? `Yes: ${yesWidth.toFixed(1)}%` : ""}
      </div>

      {/* No Votes (Right Side) */}
      <div
        className="h-full bg-red-500 transition-all duration-500 flex items-center justify-end pr-2 text-xs font-bold text-white"
        style={{ width: `${noWidth}%` }}
      >
        {noWidth > 10 ? `No: ${noWidth.toFixed(1)}%` : ""}
      </div>
    </div>
  );
}
