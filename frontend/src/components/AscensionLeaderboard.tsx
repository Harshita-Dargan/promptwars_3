// src/components/AscensionLeaderboard.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Cloud } from "lucide-react";

interface LeaderboardUser {
  rank: number;
  username: string;
  altitude: number;      // in meters
  current_mass: number;  // in kg CO2
  baseline_mass: number; // in kg CO2
}

interface LeaderboardProps {
  users: LeaderboardUser[];
  currentUserId?: string;
}

const ALTITUDE_ZONES = [
  { name: "Exosphere (Lightest)", min: 8000, color: "from-sky-300 to-indigo-900" },
  { name: "Stratosphere", min: 5000, color: "from-blue-400 to-indigo-950" },
  { name: "Troposphere (Mist)", min: 2000, color: "from-slate-400 to-blue-900" },
  { name: "Ground (Heavy Debt)", min: 0, color: "from-stone-700 to-slate-900" },
];

export default function AscensionLeaderboard({ users, currentUserId }: LeaderboardProps) {
  const sortedUsers = [...users].sort((a, b) => b.altitude - a.altitude);

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl p-6 md:p-8">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-slate-950 to-stone-950/40 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent">
            Ascension Heights
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Rising in real-time as carbon mass is chipped away. Who floats highest?
          </p>
        </div>
        <div className="flex gap-2 items-center bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 text-xs text-slate-300">
          <Cloud className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>Maximum Altitude: 10,000m</span>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Altitude Atmospheric Zones */}
        <div className="md:col-span-4 flex flex-col justify-between border-r border-slate-800/60 pr-4 h-[400px]">
          {ALTITUDE_ZONES.map((zone, idx) => (
            <div key={idx} className="flex flex-col gap-1 border-l-2 border-slate-800 pl-4 py-2 relative">
              <div className="absolute w-3 h-3 rounded-full bg-slate-800 -left-[7px] top-[14px]" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                &gt; {zone.min}m
              </span>
              <span className="text-sm font-bold text-slate-200">{zone.name}</span>
            </div>
          ))}
        </div>

        {/* Right Side: Floating Rankings List */}
        <div className="md:col-span-8 flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin">
          <AnimatePresence>
            {sortedUsers.map((user, index) => {
              const reductionPercent = Math.round(
                ((user.baseline_mass - user.current_mass) / user.baseline_mass) * 100
              );
              
              return (
                <motion.div
                  key={user.username}
                  layoutId={`user-row-${user.username}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 bg-slate-900/65 ${
                    user.username === currentUserId
                      ? "border-emerald-500/85 bg-emerald-950/10 shadow-lg shadow-emerald-950/20"
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/80 text-sm font-black text-slate-300">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{user.username}</span>
                        {user.username === currentUserId && (
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>Mass Left: <strong className="text-slate-200">{Math.round(user.current_mass)} kg</strong></span>
                        <span className="text-slate-600">•</span>
                        <span className="text-emerald-400 font-medium">-{reductionPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-sky-400 font-extrabold text-lg">
                      <ArrowUp className="w-4 h-4 animate-bounce" />
                      <span>{Math.round(user.altitude)}m</span>
                    </div>
                    <span className="text-[10px] text-slate-500 tracking-wider uppercase">
                      Altitude Height
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
