// src/components/BoulderVisualizer.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

interface BoulderVisualizerProps {
  currentMass: number;
  baselineMass: number;
}

export default function BoulderVisualizer({ currentMass, baselineMass }: BoulderVisualizerProps) {
  // Compute ratio of remaining mass
  const ratio = baselineMass > 0 ? currentMass / baselineMass : 1.0;
  
  // Boulder sizing constraints
  const boulderScale = 0.4 + (ratio * 0.6); // Scale ranges from 0.4 (almost gone) to 1.0 (full weight)
  
  // Number of visible cracks/lines based on how much mass has been chipped
  const massSaved = Math.max(0, baselineMass - currentMass);
  const showCracks = massSaved > 0;
  
  return (
    <div className="relative w-full flex flex-col items-center justify-center py-12 overflow-hidden bg-slate-950/20 rounded-3xl border border-slate-900">
      {/* Light Rays beneath the boulder */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[80px] -z-10 pointer-events-none" />
      
      {ratio < 0.3 && (
        <div className="absolute w-[250px] h-[250px] rounded-full bg-emerald-500/10 blur-[80px] -z-10 pointer-events-none animate-pulse" />
      )}

      {/* Floating Boulder Container */}
      <motion.div
        animate={{
          y: [-12, 12, -12],
          rotate: [-1, 1, -1]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ scale: boulderScale }}
        className="relative w-64 h-64 flex items-center justify-center cursor-pointer"
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_25px_25px_rgba(0,0,0,0.85)] filter"
          role="img"
          aria-label="Visual representation of carbon burden boulder. Boulder shrinks and cracks as carbon debt is reduced."
        >
          <defs>
            <radialGradient id="boulderGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="60%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            
            <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Boulder Outer Shadow */}
          <path
            d="M 40,80 Q 20,110 30,140 Q 50,180 90,175 Q 140,180 170,140 Q 185,100 160,70 Q 130,30 90,40 Q 60,40 40,80 Z"
            fill="black"
            opacity="0.2"
            transform="translate(4, 8)"
          />

          {/* The Boulder Base shape */}
          <path
            d="M 40,80 Q 20,110 30,140 Q 50,180 90,175 Q 140,180 170,140 Q 185,100 160,70 Q 130,30 90,40 Q 60,40 40,80 Z"
            fill="url(#boulderGrad)"
            stroke="#374151"
            strokeWidth="3"
          />

          {/* Boulder Textures / Craggy Ridges */}
          <path d="M 35,100 Q 60,95 80,110 Q 110,120 140,105" fill="none" stroke="#1f2937" strokeWidth="2.5" />
          <path d="M 75,55 Q 90,80 80,120 Q 95,150 110,165" fill="none" stroke="#111827" strokeWidth="3" />
          <path d="M 125,60 Q 130,95 155,115" fill="none" stroke="#1f2937" strokeWidth="2" />
          <path d="M 50,150 Q 80,145 105,155" fill="none" stroke="#111827" strokeWidth="2.5" />

          {/* Cracks revealing glowing light inside as mass is chipped */}
          {showCracks && (
            <>
              {/* Main glowing crack */}
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                d="M 90,40 L 95,75 L 85,110 L 98,145 L 90,175"
                fill="none"
                stroke="url(#glowGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              />
              {/* Secondary branch cracks */}
              {ratio < 0.7 && (
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ delay: 0.5, duration: 1.2 }}
                  d="M 85,110 L 55,120 L 30,135"
                  fill="none"
                  stroke="url(#glowGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                />
              )}
              {ratio < 0.5 && (
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ delay: 0.8, duration: 1.2 }}
                  d="M 95,75 L 125,80 L 155,75"
                  fill="none"
                  stroke="url(#glowGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                />
              )}
            </>
          )}
        </svg>

        {/* Chipped rock particles flying off (Only when boulder is cracked) */}
        {showCracks && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-stone-600 rounded-sm"
                style={{
                  left: "50%",
                  top: "50%",
                }}
                animate={{
                  x: [0, (i % 2 === 0 ? 1 : -1) * (Math.random() * 80 + 40)],
                  y: [0, (Math.random() * 80 - 40)],
                  rotate: [0, Math.random() * 360],
                  opacity: [1, 0]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Narrative Weight Readout */}
      <div className="text-center mt-6 relative z-10">
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
          Carbon Burden
        </span>
        <h4 className="text-2xl font-black text-white mt-1">
          {Math.round(currentMass).toLocaleString()} <span className="text-sm font-normal text-slate-400">kg CO₂e</span>
        </h4>
        <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
          {ratio > 0.8 
            ? "Your boulder is intact. Commit to sustainable actions to fracture it."
            : ratio > 0.4
              ? "The stone is cracking. Light is breaking through the heavy shell."
              : "The boulder is dissolving. You are floating free from the earth."
          }
        </p>
      </div>
    </div>
  );
}
