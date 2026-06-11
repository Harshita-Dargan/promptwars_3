// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cloud, 
  Lock, 
  UserPlus, 
  Compass, 
  Award, 
  CheckCircle, 
  Activity, 
  LogOut, 
  HelpCircle, 
  Zap, 
  ShieldCheck 
} from "lucide-react";

import OnboardingQuiz from "@/components/OnboardingQuiz";
import BoulderVisualizer from "@/components/BoulderVisualizer";
import StoryDashboard from "@/components/StoryDashboard";
import AscensionLeaderboard from "@/components/AscensionLeaderboard";

const API_BASE = "https://carbon-backend-389647032950.us-central1.run.app";

interface UserState {
  id: string;
  username: string;
  email: string;
  baseline_mass: number;
  current_mass: number;
  altitude: number;
  onboarding_completed: boolean;
}

export default function Home() {
  // Authentication state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Application data states
  const [activeTab, setActiveTab] = useState<"vision" | "actions" | "leaderboard">("vision");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [latestStory, setLatestStory] = useState<{ story_text: string; environmental_state: string } | null>(null);
  const [actionsList, setActionsList] = useState([]);
  const [leaderboardList, setLeaderboardList] = useState([]);
  const [progressHistory, setProgressHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  // Sync token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("carbon_auth_token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserData(savedToken);
    }
  }, []);

  // Fetch all dependencies once authenticated
  useEffect(() => {
    if (token && user) {
      if (user.onboarding_completed) {
        fetchAllData();
      } else {
        fetchQuizQuestions();
      }
    }
  }, [token, user?.id, user?.onboarding_completed]);

  const headers = (tok: string | null) => ({
    "Content-Type": "application/json",
    ...(tok ? { Authorization: `Bearer ${tok}` } : {})
  });

  const fetchUserData = async (tok: string) => {
    try {
      // Fetch user profile info via leaderboard API or simple request helper
      // For ease, we login and return user context directly, but we can verify it
      const res = await fetch(`${API_BASE}/api/leaderboard`, { headers: headers(tok) });
      if (res.ok) {
        const data = await res.json();
        // Extract current logged-in user details from leaderboard
        const username_decoded = JSON.parse(atob(tok.split(".")[1])).sub;
        const self = data.leaderboard.find((u: any) => u.username === username_decoded);
        if (self) {
          setUser({
            id: "",
            username: self.username,
            email: "",
            baseline_mass: self.baseline_mass,
            current_mass: self.current_mass,
            altitude: self.altitude,
            onboarding_completed: true
          });
        } else {
          // Fallback if onboarding not finished
          setUser({
            id: "",
            username: username_decoded,
            email: "",
            baseline_mass: 0,
            current_mass: 0,
            altitude: 0,
            onboarding_completed: false
          });
        }
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error(e);
      handleLogout();
    }
  };

  const fetchQuizQuestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quiz/questions`, { headers: headers(token) });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const authHeaders = headers(token);
      
      // 1. Fetch latest ecosystem story
      const storyRes = await fetch(`${API_BASE}/api/story/latest`, { headers: authHeaders });
      if (storyRes.ok) {
        const storyData = await storyRes.json();
        setLatestStory(storyData);
      }

      // 2. Fetch actions catalog
      const actionsRes = await fetch(`${API_BASE}/api/actions`, { headers: authHeaders });
      if (actionsRes.ok) {
        const actionsData = await actionsRes.json();
        setActionsList(actionsData);
      }

      // 3. Fetch leaderboard
      const lbRes = await fetch(`${API_BASE}/api/leaderboard`, { headers: authHeaders });
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboardList(lbData.leaderboard);
        
        // Keep current user object synchronized with server metrics
        const self = lbData.leaderboard.find((u: any) => u.username === user?.username);
        if (self && user) {
          setUser(prev => prev ? {
            ...prev,
            baseline_mass: self.baseline_mass,
            current_mass: self.current_mass,
            altitude: self.altitude,
            onboarding_completed: true
          } : null);
        }
      }

      // 4. Fetch progress logs
      const progRes = await fetch(`${API_BASE}/api/progress/history`, { headers: authHeaders });
      if (progRes.ok) {
        const progData = await progRes.json();
        setProgressHistory(progData.history);
      }

    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const url = authMode === "login" 
      ? `${API_BASE}/api/auth/login` 
      : `${API_BASE}/api/auth/register`;

    const body = authMode === "login"
      ? { username, password }
      : { username, email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Authentication request failed.");
      }

      if (authMode === "login") {
        const data = await res.json();
        localStorage.setItem("carbon_auth_token", data.access_token);
        setToken(data.access_token);
        setUser(data.user);
      } else {
        // Switch to login tab on registration success
        setAuthMode("login");
        setAuthError("Registration successful! Please login.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Something went wrong.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("carbon_auth_token");
    setToken(null);
    setUser(null);
    setLatestStory(null);
    setActionsList([]);
    setLeaderboardList([]);
    setProgressHistory([]);
    setUsername("");
    setPassword("");
    setEmail("");
  };

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    try {
      const res = await fetch(`${API_BASE}/api/quiz/submit`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ responses: answers })
      });

      if (res.ok) {
        const data = await res.json();
        if (user) {
          setUser({
            ...user,
            baseline_mass: data.baseline_mass,
            current_mass: data.current_mass,
            altitude: data.altitude,
            onboarding_completed: true
          });
        }
      } else {
        alert("Failed to submit onboarding quiz responses.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegenerateStory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/story/regenerate`, {
        method: "POST",
        headers: headers(token)
      });
      if (res.ok) {
        const data = await res.json();
        setLatestStory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartAction = async (actionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/actions/${actionId}/start`, {
        method: "POST",
        headers: headers(token)
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteAction = async (actionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/actions/${actionId}/complete`, {
        method: "POST",
        headers: headers(token)
      });
      if (res.ok) {
        const data = await res.json();
        setActionSuccessMessage(data.message);
        setTimeout(() => setActionSuccessMessage(""), 5000);
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mock auto-verify provider simulation to verify zero-friction UX flow
  const handleAutoVerifyAction = async (actionId: string, provider: string) => {
    try {
      // Mock utility response data
      const mockPayload = {
        provider,
        payload: provider === "smart_meter_api" 
          ? { smart_meter_id: "sm_grid_992a", avg_daily_kwh_reduction: 4.8 }
          : { receipt_id: "rec_993b8", sustainable_items_count: 3 }
      };

      const res = await fetch(`${API_BASE}/api/actions/${actionId}/verify`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(mockPayload)
      });

      if (res.ok) {
        const data = await res.json();
        setActionSuccessMessage(`Auto-verified via ${provider}! Saved ${Math.round(data.carbon_saving_verified_kg)} kg!`);
        setTimeout(() => setActionSuccessMessage(""), 5000);
        fetchAllData();
      } else {
        alert("Automated verification failed.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="min-h-screen text-slate-100 bg-slate-950 font-sans antialiased pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-6 h-6 text-sky-400" />
            <span className="font-extrabold text-lg tracking-tight bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 text-transparent">
              ANTIGRAVITY CARBON
            </span>
          </div>

          {token && user && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-400">@{user.username}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-slate-500 hover:text-red-400 text-xs font-bold transition-all py-1.5 px-3 rounded-full hover:bg-slate-900 border border-slate-900 hover:border-slate-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">
        <AnimatePresence mode="wait">
          
          {/* Auth Tab */}
          {!token && (
            <motion.div
              key="auth-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto mt-16"
            >
              <div className="bg-slate-950 border border-slate-900 shadow-2xl rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/10 via-slate-950 to-stone-950/20 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center mb-6">
                  <Cloud className="w-10 h-10 text-sky-400 mb-3" />
                  <h2 className="text-2xl font-black text-white">
                    {authMode === "login" ? "Begin Ascension" : "Initialize Account"}
                  </h2>
                  <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed">
                    Track your carbon footprint as a physical weight. Chip it away to rise in altitude.
                  </p>
                </div>

                <form onSubmit={handleAuth} className="relative z-10 space-y-4">
                  {authError && (
                    <div className="bg-red-500/10 border border-red-950/30 text-red-400 text-xs font-bold p-3 rounded-xl text-center">
                      {authError}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none text-white px-4 py-3 rounded-xl text-sm transition-all"
                    />
                  </div>

                  {authMode === "register" && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Enter email"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none text-white px-4 py-3 rounded-xl text-sm transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none text-white px-4 py-3 rounded-xl text-sm transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all duration-300 shadow-lg shadow-indigo-950/40 hover:scale-[1.01] flex items-center justify-center gap-2"
                  >
                    {authMode === "login" ? <Lock className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span>{authMode === "login" ? "Login" : "Register"}</span>
                  </button>
                </form>

                <div className="relative z-10 flex justify-center items-center mt-6 text-xs text-slate-400">
                  <span>
                    {authMode === "login" ? "New here?" : "Already registered?"}{" "}
                    <button
                      onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                      className="text-sky-400 hover:underline font-bold"
                    >
                      {authMode === "login" ? "Create an account" : "Sign in"}
                    </button>
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Onboarding Diagnostic Tab */}
          {token && user && !user.onboarding_completed && (
            <motion.div
              key="onboarding-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12"
            >
              <OnboardingQuiz questions={quizQuestions} onSubmit={handleQuizSubmit} />
            </motion.div>
          )}

          {/* Main Dashboard Panel */}
          {token && user && user.onboarding_completed && (
            <motion.div
              key="dashboard-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Boulder visualizer & Sparkline Graph */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <BoulderVisualizer currentMass={user.current_mass} baselineMass={user.baseline_mass} />

                {/* Progress Sparkline Card */}
                <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">
                        Timelines
                      </span>
                      <h5 className="text-sm font-bold text-slate-200 mt-0.5">Atmospheric Altitude</h5>
                    </div>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>

                  {/* SVG Sparkline Graph */}
                  {progressHistory.length > 0 ? (
                    <div className="h-28 w-full mt-2 relative">
                      <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Area Fill */}
                        <path
                          d={`M 0,40 ${progressHistory.map((pt: any, i) => {
                            const x = (i / (progressHistory.length - 1)) * 100;
                            const y = 40 - (pt.altitude / 10000.0) * 35; // scale height
                            return `L ${x},${y}`;
                          }).join(" ")} L 100,40 Z`}
                          fill="url(#chartGlow)"
                        />
                        
                        {/* Line Path */}
                        <path
                          d={progressHistory.map((pt: any, i) => {
                            const x = (i / (progressHistory.length - 1)) * 100;
                            const y = 40 - (pt.altitude / 10000.0) * 35;
                            return `${i === 0 ? "M" : "L"} ${x},${y}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />

                        {/* Interactive Nodes */}
                        {progressHistory.map((pt: any, i) => {
                          const x = (i / (progressHistory.length - 1)) * 100;
                          const y = 40 - (pt.altitude / 10000.0) * 35;
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="2"
                              fill="#ffffff"
                              stroke="#06b6d4"
                              strokeWidth="1.5"
                            />
                          );
                        })}
                      </svg>
                    </div>
                  ) : (
                    <div className="h-28 flex items-center justify-center text-xs text-slate-500 italic">
                      Constructing visual logs...
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mt-3">
                    <span>Baseline Onboard</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Tab View Panels */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Custom Tab Selector */}
                <div className="bg-slate-950 border border-slate-900 p-1.5 rounded-2xl flex gap-1 w-full max-w-lg mx-auto sm:mx-0">
                  <button
                    onClick={() => setActiveTab("vision")}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      activeTab === "vision"
                        ? "bg-slate-900 border border-slate-800 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Ecosystem Vision</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      activeTab === "actions"
                        ? "bg-slate-900 border border-slate-800 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Action Registry</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("leaderboard")}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      activeTab === "leaderboard"
                        ? "bg-slate-900 border border-slate-800 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Ascension Heights</span>
                  </button>
                </div>

                {/* Tab Contents */}
                {actionSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-950/30 text-emerald-400 text-xs font-bold p-3.5 rounded-2xl flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{actionSuccessMessage}</span>
                  </motion.div>
                )}

                <div className="min-h-[400px]">
                  {activeTab === "vision" && latestStory && (
                    <StoryDashboard
                      storyText={latestStory.story_text}
                      environmentalState={latestStory.environmental_state as any}
                      currentMass={user.current_mass}
                      altitude={user.altitude}
                      onRegenerate={handleRegenerateStory}
                    />
                  )}

                  {activeTab === "actions" && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950 border border-slate-900 p-5 rounded-3xl mb-2">
                        <div>
                          <h3 className="text-lg font-extrabold text-white">Chip Away Mass</h3>
                          <p className="text-slate-400 text-xs mt-0.5">
                            Commit to habits or connect utilities for automated delta verification.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {actionsList.map((act: any) => (
                          <div
                            key={act.id}
                            className={`p-5 rounded-3xl border bg-slate-950/50 backdrop-blur-sm flex flex-col justify-between h-[230px] transition-all ${
                              act.user_status === "completed"
                                ? "border-emerald-950/30 bg-emerald-950/5"
                                : "border-slate-900 hover:border-slate-800"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                  act.category === "transit"
                                    ? "border-sky-900/40 text-sky-400 bg-sky-950/10"
                                    : act.category === "diet"
                                      ? "border-emerald-900/40 text-emerald-400 bg-emerald-950/10"
                                      : act.category === "energy"
                                        ? "border-amber-900/40 text-amber-400 bg-amber-950/10"
                                        : "border-purple-900/40 text-purple-400 bg-purple-950/10"
                                }`}>
                                  {act.category}
                                </span>
                                <span className="text-xs text-sky-400 font-extrabold">
                                  -{act.carbon_saving} kg/yr
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-white mt-3">{act.title}</h4>
                              <p className="text-slate-400 text-xs mt-1.5 line-clamp-3 leading-relaxed">
                                {act.description}
                              </p>
                            </div>

                            <div className="flex gap-2 mt-4 pt-2 border-t border-slate-900/50">
                              {/* Option 1: Not Committed yet */}
                              {!act.user_status && (
                                <button
                                  onClick={() => handleStartAction(act.id)}
                                  className="w-full bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs font-extrabold py-2 px-4 rounded-xl transition-all"
                                >
                                  Commit Habit
                                </button>
                              )}

                              {/* Option 2: Active (Committed but not completed yet) */}
                              {act.user_status === "active" && (
                                <>
                                  <button
                                    onClick={() => handleCompleteAction(act.id)}
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold py-2 px-3 rounded-xl transition-all"
                                  >
                                    Done
                                  </button>
                                  {act.auto_verify_provider && (
                                    <button
                                      onClick={() => handleAutoVerifyAction(act.id, act.auto_verify_provider)}
                                      className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sky-400 text-xs font-extrabold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1"
                                      title={`Auto-verify via ${act.auto_verify_provider}`}
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                                      <span>Auto-Verify</span>
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Option 3: Completed */}
                              {act.user_status === "completed" && (
                                <div className="w-full flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-extrabold py-2 bg-emerald-950/20 rounded-xl border border-emerald-900/30">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Mass Chipped Off!</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "leaderboard" && (
                    <AscensionLeaderboard users={leaderboardList} currentUserId={user.username} />
                  )}
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
