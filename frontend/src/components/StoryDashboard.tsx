// src/components/StoryDashboard.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Leaf, AlertTriangle, CloudSun, Compass } from "lucide-react";

interface StoryDashboardProps {
  storyText: string;
  environmentalState: "foggy_abyss" | "cracked_earth" | "misty_hill" | "clear_sky";
  currentMass: number;
  altitude: number;
  onRegenerate: () => Promise<void>;
}

const ENVIRONMENTAL_CONFIGS = {
  foggy_abyss: {
    title: "The Smoggy Abyss",
    tagline: "Your carbon debt is a crushing weight. The ecosystem suffocates.",
    textColor: "text-red-400",
    bgColor: "from-stone-900 via-zinc-950 to-red-950/20",
    borderColor: "border-red-900/30",
    icon: AlertTriangle,
  },
  cracked_earth: {
    title: "The Cracked Valley",
    tagline: "The dry earth feels the heat of carbon heat domes.",
    textColor: "text-amber-400",
    bgColor: "from-zinc-900 via-stone-950 to-amber-950/20",
    borderColor: "border-amber-900/30",
    icon: AlertTriangle,
  },
  misty_hill: {
    title: "Misty Foothills",
    tagline: "You are rising. Clouds clear and sprouts emerge.",
    textColor: "text-cyan-400",
    bgColor: "from-slate-900 via-sky-950 to-cyan-950/20",
    borderColor: "border-cyan-900/30",
    icon: CloudSun,
  },
  clear_sky: {
    title: "The Ether Sky",
    tagline: "Pure, weightless flight. You have balanced the scale.",
    textColor: "text-emerald-400",
    bgColor: "from-blue-950 via-slate-950 to-emerald-950/30",
    borderColor: "border-emerald-900/30",
    icon: Leaf,
  },
};

export default function StoryDashboard({
  storyText,
  environmentalState,
  currentMass,
  altitude,
  onRegenerate,
}: StoryDashboardProps) {
  const [loading, setLoading] = useState(false);
  const config = ENVIRONMENTAL_CONFIGS[environmentalState] || ENVIRONMENTAL_CONFIGS.cracked_earth;
  const EnvIcon = config.icon;

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await onRegenerate();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border p-6 md:p-8 bg-gradient-to-br transition-all duration-1000 ${config.bgColor} ${config.borderColor} shadow-2xl`}>
      {/* Background Micro-particle animations */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-10, -80],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
        
        {/* Left Side: Physical Weight Display Card */}
        <div className="w-full md:w-[32%] flex flex-col gap-4">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex flex-col justify-between h-[150px]">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Active Burden
              </span>
              <h3 className="text-3xl font-black text-white mt-1">
                {currentMass.toLocaleString()} <span className="text-sm font-normal text-slate-400">kg CO₂</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Every sustainable habit chips pieces off this heavy boulder.
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex flex-col justify-between h-[150px]">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Current Elevation
              </span>
              <h3 className="text-3xl font-black text-sky-400 mt-1 flex items-baseline gap-1">
                {Math.round(altitude).toLocaleString()} <span className="text-sm font-normal text-slate-400">meters</span>
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Compass className="w-3.5 h-3.5 text-slate-500" />
              <span>Floating in the {config.title}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Narrative Story and Status */}
        <div className="w-full md:w-[68%] flex flex-col justify-between min-h-[316px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl bg-slate-900/80 border border-slate-800 ${config.textColor}`}>
                  <EnvIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-extrabold text-white">{config.title}</h4>
                  <span className="text-xs text-slate-400 font-medium">{config.tagline}</span>
                </div>
              </div>
            </div>

            {/* Glassmorphic Narrative Panel */}
            <div className="relative bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-800/40 p-5 md:p-6 overflow-y-auto max-h-[180px]">
              <p className="text-slate-200 text-base leading-relaxed tracking-wide italic font-medium">
                "{storyText}"
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-full text-sm transition-all duration-300 shadow-lg shadow-indigo-900/30 hover:scale-[1.02]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
              <span>{loading ? "Re-painting Ecosystem..." : "Recalculate Vision"}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
