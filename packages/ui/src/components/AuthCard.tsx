"use client";

import React, { useState } from "react";
import { InputField } from "./InputField";
import { AuthButton } from "./AuthButton";
import { Divider } from "./Divider";
import { SocialButton } from "./SocialButton";
import { UserIcon } from "../icons/UserIcon";
import { MailIcon } from "../icons/MailIcon";
import { LockIcon } from "../icons/LockIcon";
import { GoogleIcon } from "../icons/GoogleIcon";
import { GithubIcon } from "../icons/GithubIcon";
import { ExcalidrawLogo } from "../icons/ExcalidrawLogo";

type AuthMode = "login" | "signup";

interface AuthCardProps {
  onLogin?: (data: { email: string; password: string }) => void;
  onSignup?: (data: { name: string; email: string; password: string }) => void;
  onGoogleAuth?: () => void;
  onGithubAuth?: () => void;
  defaultMode?: AuthMode;
}

export function AuthCard({
  onLogin,
  onSignup,
  onGoogleAuth,
  onGithubAuth,
  defaultMode = "login",
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLogin = mode === "login";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onLogin?.({ email, password });
    } else {
      onSignup?.({ name, email, password });
    }
  };

  const switchMode = () => {
    setMode(isLogin ? "signup" : "login");
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="relative w-full max-w-[440px] min-h-[580px] bg-[rgba(35,35,41,0.6)] backdrop-blur-[20px] rounded-[20px] border border-[rgba(168,165,255,0.1)] px-9 py-8 box-border z-1 flex flex-col">
      {/* Subtle glow behind card */}
      <div className="absolute -top-px -left-px -right-px -bottom-px rounded-[21px] bg-linear-[135deg] from-[rgba(168,165,255,0.15)] via-transparent to-[rgba(168,165,255,0.08)] -z-1 pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-5">
        <div className="flex justify-center mb-3">
          <ExcalidrawLogo size={36} />
        </div>
        <h1 className="text-[26px] font-bold text-[#f0f0f5] m-0 tracking-[-0.02em] leading-[1.2]">
          {isLogin ? "Welcome back" : "Create account"}
        </h1>
        <p className="text-sm text-[#7a7a8a] mt-1.5 mb-0 leading-normal">
          {isLogin
            ? "Sign in to continue to Excalidraw"
            : "Sign up to get started with Excalidraw"}
        </p>
      </div>

      {/* Tabs */}
      <div className="relative flex bg-[#1a1a22] rounded-xl p-1 mb-4 overflow-hidden">
        <button
          id="auth-tab-login"
          type="button"
          onClick={() => {
            setMode("login");
            setName("");
            setEmail("");
            setPassword("");
          }}
          className={`flex-1 py-2.5 bg-transparent border-none text-[13px] font-semibold cursor-pointer rounded-lg transition-colors duration-200 relative z-2 tracking-[0.02em] ${isLogin ? "text-[#f0f0f5]" : "text-[#6b6b7b]"}`}
        >
          Sign In
        </button>
        <button
          id="auth-tab-signup"
          type="button"
          onClick={() => {
            setMode("signup");
            setName("");
            setEmail("");
            setPassword("");
          }}
          className={`flex-1 py-2.5 bg-transparent border-none text-[13px] font-semibold cursor-pointer rounded-lg transition-colors duration-200 relative z-2 tracking-[0.02em] ${!isLogin ? "text-[#f0f0f5]" : "text-[#6b6b7b]"}`}
        >
          Sign Up
        </button>
        {/* Active indicator */}
        <div
          className="absolute top-1 left-1 w-[calc(50%-4px)] h-[calc(100%-8px)] bg-[rgba(168,165,255,0.12)] rounded-lg transition-transform duration-300 ease-in-out z-1"
          style={{
            transform: isLogin ? "translateX(0)" : "translateX(100%)",
          }}
        />
      </div>

      {/* Social buttons */}
      <div className="flex gap-3 mb-3">
        <SocialButton
          id="auth-google-btn"
          icon={<GoogleIcon size={18} />}
          onClick={onGoogleAuth}
        >
          Google
        </SocialButton>
        <SocialButton
          id="auth-github-btn"
          icon={<GithubIcon size={18} />}
          onClick={onGithubAuth}
        >
          GitHub
        </SocialButton>
      </div>

      <Divider text="or continue with email" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col flex-1">
        {!isLogin && (
          <div className="mb-3">
            <InputField
              id="auth-name"
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<UserIcon size={18} color="#6b6b7b" />}
              required={!isLogin}
              autoComplete="name"
            />
          </div>
        )}

        <div className="mb-3">
          <InputField
            id="auth-email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<MailIcon size={18} color="#6b6b7b" />}
            required
            autoComplete="email"
          />
        </div>

        <div className="mb-3">
          <InputField
            id="auth-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<LockIcon size={18} color="#6b6b7b" />}
            required
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </div>

        <div className="mt-auto">
          {isLogin && (
            <div className="text-right mb-3 -mt-1">
              <a
                href="#"
                className="text-[13px] text-[#a8a5ff] no-underline font-medium cursor-pointer"
              >
                Forgot password?
              </a>
            </div>
          )}

          <AuthButton id="auth-submit-btn" type="submit" variant="primary">
            {isLogin ? "Sign In" : "Create Account"}
          </AuthButton>
        </div>
      </form>

      {/* Footer */}
      <p className="text-center mt-4 text-[13px] text-[#6b6b7b]">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          id="auth-switch-mode"
          type="button"
          onClick={switchMode}
          className="bg-transparent border-none text-[#a8a5ff] text-[13px] font-semibold cursor-pointer p-0 no-underline"
        >
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
