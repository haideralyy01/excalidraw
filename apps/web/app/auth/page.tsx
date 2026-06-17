"use client";

import React, { Suspense } from "react";
import { AuthCard } from "@repo/ui/components/AuthCard";
import { ExcalidrawLogo } from "@repo/ui/icons/index";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";


const API_BASE = "http://localhost:8000/api/v1";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const handleLogin = async (data: {email: string; password: string}) => {
    try {
      const response = await axios.post(`${API_BASE}/login`, data);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userName", response.data.user.name);
      router.push(redirectTo);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Login failed";
      alert(msg);
    }
  };

  const handleSignup = async (data: {name: string; email: string; password: string}) => {
    try {
      const response = await axios.post(`${API_BASE}/signup`, data);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userName", response.data.user.name);
      router.push(redirectTo);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Signup failed";
      alert(msg);
    }
  };
  
  return (
    <div className="flex min-h-screen bg-[#121212] overflow-hidden">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 relative flex-col items-center justify-center p-15 overflow-hidden bg-auth-panel">
        {/* Grid dots */}
        <div className="absolute inset-0 pointer-events-none z-1 bg-auth-dots" />

        {/* Ambient orbs */}
        <div className="absolute w-75 h-75 rounded-full blur-[80px] pointer-events-none z-0 top-[10%] right-[-10%] bg-[rgba(168,165,255,0.08)] animate-pulse-glow" />
        <div className="absolute w-50 h-50 rounded-full blur-[80px] pointer-events-none z-0 bottom-[20%] left-[5%] bg-[rgba(168,165,255,0.05)] animate-pulse-glow-delayed" />

        {/* Excalidraw Logo */}
        <div className="relative z-2">
          <ExcalidrawLogo size={120} />
        </div>

        {/* Brand text */}
        <div className="relative z-2 text-center mt-10 animate-fade-in-up-delayed">
          <h2 className="font-caveat text-6xl font-bold bg-gradient-brand leading-none tracking-wide">
            Excalidraw
          </h2>
          <p className="text-[15px] text-[#6b6b7b] max-w-[320px] leading-relaxed mt-3">
            Collaborate on hand-drawn diagrams with your team in real-time.
            Sketch ideas, share instantly.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex gap-4 mt-10 animate-fade-in-up-delayed-2 relative z-2">
          {["Real-time Sync", "Team Collaboration", "End-to-End Encrypted"].map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide text-[#9d9dab] border border-[rgba(168,165,255,0.1)] bg-[rgba(168,165,255,0.06)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#a8a5ff]" />
              {label}
            </div>
          ))}
        </div>

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-divider-glow" />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 relative min-h-screen lg:max-w-140">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none bg-auth-radial" />

        {/* Corner decorations */}
        <div className="absolute top-6 left-6 w-15 h-15 pointer-events-none opacity-15 border-t-[1.5px] border-l-[1.5px] border-[#a8a5ff] rounded-tl-xl" />
        <div className="absolute bottom-6 right-6 w-15 h-15 pointer-events-none opacity-15 border-b-[1.5px] border-r-[1.5px] border-[#a8a5ff] rounded-br-xl" />

        {/* Auth card */}
        <div className="animate-fade-in-up w-full flex justify-center">
          <AuthCard
            defaultMode="login"
            onLogin={handleLogin}
            onSignup={handleSignup}
            onGoogleAuth={() => {
              console.log("Google auth");
            }}
            onGithubAuth={() => {
              console.log("GitHub auth");
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212] flex items-center justify-center text-white font-medium text-sm">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
