"use client";

import { ShieldCheck, Award, AlertTriangle, ShieldAlert } from "lucide-react";
import { TrustScoreResult } from "@/lib/trust-score";

interface TrustScoreBadgeProps {
  score: number;
  tier: TrustScoreResult["tier"];
}

export default function TrustScoreBadge({ score, tier }: TrustScoreBadgeProps) {
  // Calculate SVG circle circumference (Radius = 42 -> Circumference ≈ 263.89)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(score, 5), 100) / 100) * circumference;

  // Dynamic color theme based on tier
  const isHigh = score >= 80;
  const isMedium = score >= 50 && score < 80;

  const colorScheme = isHigh
    ? {
        stroke: "stroke-emerald-400",
        glow: "shadow-emerald-500/20",
        bgBadge: "bg-emerald-950/60 border-emerald-700/80 text-emerald-300",
        textColor: "text-emerald-400",
        icon: <Award className="w-4 h-4 text-emerald-400" />,
        statusTag: "Anti-Spam Verified ✓",
        statusColor: "text-emerald-400 bg-emerald-950/50 border-emerald-800",
      }
    : isMedium
    ? {
        stroke: "stroke-amber-400",
        glow: "shadow-amber-500/20",
        bgBadge: "bg-amber-950/60 border-amber-700/80 text-amber-300",
        textColor: "text-amber-400",
        icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
        statusTag: "Moderate Trust",
        statusColor: "text-amber-400 bg-amber-950/50 border-amber-800",
      }
    : {
        stroke: "stroke-rose-500",
        glow: "shadow-rose-500/20",
        bgBadge: "bg-rose-950/60 border-rose-800/80 text-rose-300",
        textColor: "text-rose-400",
        icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        statusTag: "High Impersonation Risk ⚠️",
        statusColor: "text-rose-400 bg-rose-950/50 border-rose-800",
      };

  return (
    <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Ambient background glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${
        isHigh ? "bg-emerald-500" : isMedium ? "bg-amber-500" : "bg-rose-500"
      }`} />

      {/* Radial SVG progress circle */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Active progress ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`${colorScheme.stroke} transition-all duration-1000 ease-out`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Centered score value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black text-white tracking-tight leading-none">
            {score}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Trust Score
          </span>
        </div>
      </div>

      {/* Bottom tier badge */}
      <div className="mt-4 text-center space-y-1.5 w-full">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black shadow-lg ${colorScheme.bgBadge} ${colorScheme.glow}`}>
          {colorScheme.icon}
          <span>{tier}</span>
        </div>

        <div>
          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${colorScheme.statusColor}`}>
            {colorScheme.statusTag}
          </span>
        </div>
      </div>
    </div>
  );
}