// src/components/OnboardingQuiz.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, ShieldCheck, HelpCircle } from "lucide-react";

interface Option {
  value: string;
  label: string;
  mass_factor_kg: number;
}

interface Question {
  id: string;
  question: string;
  category: string;
  options: Option[];
}

interface OnboardingQuizProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => Promise<void>;
}

export default function OnboardingQuiz({ questions, onSubmit }: OnboardingQuizProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const currentQuestion = questions[currentIdx];

  const handleSelectOption = (val: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: val
    }));
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) return;
    
    if (currentIdx < questions.length - 1) {
      setDirection(1);
      setCurrentIdx(prev => prev + 1);
    } else {
      // Last question completed, submit answers
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setDirection(-1);
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(answers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 150 : -150,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -150 : 150,
      opacity: 0
    })
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl max-w-md mx-auto text-center">
        <HelpCircle className="w-12 h-12 text-slate-500 animate-pulse mb-4" />
        <h3 className="text-xl font-bold text-white">Loading Atmospheric Baseline...</h3>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl p-6 md:p-8 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/5 blur-[50px] pointer-events-none" />

      {/* Progress Bar Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
            Ecosystem Diagnostic
          </span>
          <h3 className="text-sm font-bold text-slate-300 mt-1">
            Question {currentIdx + 1} of {questions.length}
          </h3>
        </div>
        <span className="text-xs text-sky-400 font-extrabold">{progressPercent}%</span>
      </div>

      <div className="relative z-10 w-full bg-slate-900 h-1.5 rounded-full mb-8 overflow-hidden">
        <motion.div
          layoutId="onboarding-progress-bar"
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
          style={{ width: `${progressPercent}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        />
      </div>

      {/* Slide Transition Wrapper */}
      <div className="relative z-10 min-h-[300px]">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentQuestion.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
            className="flex flex-col"
          >
            <h2 className="text-xl md:text-2xl font-black text-white leading-snug tracking-tight mb-6">
              {currentQuestion.question}
            </h2>

            {/* Options List */}
            <div className="flex flex-col gap-3">
              {currentQuestion.options.map(option => {
                const selected = answers[currentQuestion.id] === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelectOption(option.value)}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-205 group ${
                      selected
                        ? "border-indigo-500 bg-indigo-950/20 text-white shadow-lg shadow-indigo-950/40"
                        : "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <span className="font-semibold text-sm md:text-base">{option.label}</span>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      selected 
                        ? "border-indigo-500 bg-indigo-500" 
                        : "border-slate-700 group-hover:border-slate-500"
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="relative z-10 flex justify-between items-center mt-8 pt-6 border-t border-slate-900">
        <button
          onClick={handleBack}
          disabled={currentIdx === 0 || isSubmitting}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white font-bold text-sm disabled:opacity-30 disabled:pointer-events-none transition-all py-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={handleNext}
          disabled={!answers[currentQuestion.id] || isSubmitting}
          className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold px-6 py-3 rounded-full text-sm transition-all duration-300 shadow-lg shadow-indigo-950/30 hover:scale-[1.02]"
        >
          <span>{currentIdx === questions.length - 1 ? (isSubmitting ? "Weighing..." : "Calculate Weight") : "Next"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
