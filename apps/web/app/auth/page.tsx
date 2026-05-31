"use client";

import React from "react";
import { AuthCard } from "@repo/ui/components/AuthCard";
import { ExcalidrawLogo } from "@repo/ui/icons/index";

export default function AuthPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap');

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        input:focus {
          border-color: #a8a5ff !important;
          box-shadow: 0 0 0 3px rgba(168, 165, 255, 0.12) !important;
        }

        input::placeholder {
          color: #4a4a57;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulseGlow 4s ease-in-out infinite; }
        .animate-pulse-glow-delayed { animation: pulseGlow 5s ease-in-out infinite 1s; }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out both; }
        .animate-fade-in-up-delayed { animation: fadeInUp 0.8s ease-out 0.3s both; }
        .animate-fade-in-up-delayed-2 { animation: fadeInUp 0.8s ease-out 0.6s both; }

        .font-caveat { font-family: 'Caveat', cursive; }

        .bg-gradient-brand {
          background: linear-gradient(135deg, #f0f0f5 0%, #a8a5ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="flex min-h-screen bg-[#121212] overflow-hidden">
        {/* Left Panel */}
        <div className="hidden lg:flex flex-1 relative flex-col items-center justify-center p-15 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #121212 0%, #1a1a2e 40%, #16162a 100%)" }}
        >
          {/* Grid dots */}
          <div
            className="absolute inset-0 pointer-events-none z-1"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(168, 165, 255, 0.06) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

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
          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(168, 165, 255, 0.2), transparent)" }}
          />
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-10 relative min-h-screen lg:max-w-140">
          {/* Subtle radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168, 165, 255, 0.04) 0%, transparent 70%)" }}
          />

          {/* Corner decorations */}
          <div className="absolute top-6 left-6 w-15 h-15 pointer-events-none opacity-15 border-t-[1.5px] border-l-[1.5px] border-[#a8a5ff] rounded-tl-xl" />
          <div className="absolute bottom-6 right-6 w-15 h-15 pointer-events-none opacity-15 border-b-[1.5px] border-r-[1.5px] border-[#a8a5ff] rounded-br-xl" />

          {/* Auth card */}
          <div className="animate-fade-in-up w-full flex justify-center">
            <AuthCard
              defaultMode="login"
              onLogin={(data) => {
                console.log("Login:", data);
              }}
              onSignup={(data) => {
                console.log("Signup:", data);
              }}
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
    </>
  );
}
