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
    <div style={styles.card}>
      {/* Subtle glow behind card */}
      <div style={styles.glowEffect} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoWrapper}>
          <ExcalidrawLogo size={36} />
        </div>
        <h1 style={styles.title}>
          {isLogin ? "Welcome back" : "Create account"}
        </h1>
        <p style={styles.subtitle}>
          {isLogin
            ? "Sign in to continue to Excalidraw"
            : "Sign up to get started with Excalidraw"}
        </p>
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button
          id="auth-tab-login"
          type="button"
          onClick={() => { setMode("login"); setName(""); setEmail(""); setPassword(""); }}
          style={{
            ...styles.tab,
            ...(isLogin ? styles.tabActive : {}),
          }}
        >
          Sign In
        </button>
        <button
          id="auth-tab-signup"
          type="button"
          onClick={() => { setMode("signup"); setName(""); setEmail(""); setPassword(""); }}
          style={{
            ...styles.tab,
            ...(!isLogin ? styles.tabActive : {}),
          }}
        >
          Sign Up
        </button>
        {/* Active indicator */}
        <div
          style={{
            ...styles.tabIndicator,
            transform: isLogin ? "translateX(0)" : "translateX(100%)",
          }}
        />
      </div>

      {/* Social buttons */}
      <div style={styles.socialRow}>
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
      <form onSubmit={handleSubmit} style={styles.form}>
        {!isLogin && (
          <div
            style={{
              ...styles.fieldWrapper,
              maxHeight: isLogin ? 0 : 90,
              opacity: isLogin ? 0 : 1,
              marginBottom: isLogin ? 0 : 16,
              overflow: "hidden",
              transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
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

        <div style={{ marginBottom: 16 }}>
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

        <div style={{ marginBottom: 24 }}>
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

        {isLogin && (
          <div style={styles.forgotRow}>
            <a href="#" style={styles.forgotLink}>
              Forgot password?
            </a>
          </div>
        )}

        <AuthButton id="auth-submit-btn" type="submit" variant="primary">
          {isLogin ? "Sign In" : "Create Account"}
        </AuthButton>
      </form>

      {/* Footer */}
      <p style={styles.footer}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          id="auth-switch-mode"
          type="button"
          onClick={switchMode}
          style={styles.switchButton}
        >
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 440,
    background: "rgba(35, 35, 41, 0.6)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 20,
    border: "1px solid rgba(168, 165, 255, 0.1)",
    padding: "40px 36px",
    boxSizing: "border-box",
    zIndex: 1,
  },
  glowEffect: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 21,
    background: "linear-gradient(135deg, rgba(168,165,255,0.15) 0%, transparent 50%, rgba(168,165,255,0.08) 100%)",
    zIndex: -1,
    pointerEvents: "none",
  },
  header: {
    textAlign: "center",
    marginBottom: 28,
  },
  logoWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#f0f0f5",
    margin: 0,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 14,
    color: "#7a7a8a",
    margin: "8px 0 0 0",
    lineHeight: 1.5,
  },
  tabContainer: {
    position: "relative",
    display: "flex",
    background: "#1a1a22",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    padding: "10px 0",
    background: "none",
    border: "none",
    color: "#6b6b7b",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    borderRadius: 8,
    transition: "color 0.25s ease",
    position: "relative",
    zIndex: 2,
    letterSpacing: "0.02em",
  },
  tabActive: {
    color: "#f0f0f5",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    width: "calc(50% - 4px)",
    height: "calc(100% - 8px)",
    background: "rgba(168, 165, 255, 0.12)",
    borderRadius: 8,
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    zIndex: 1,
  },
  socialRow: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },
  form: {
    marginTop: 20,
  },
  fieldWrapper: {},
  forgotRow: {
    textAlign: "right",
    marginBottom: 20,
    marginTop: -8,
  },
  forgotLink: {
    fontSize: 13,
    color: "#a8a5ff",
    textDecoration: "none",
    fontWeight: 500,
    cursor: "pointer",
  },
  footer: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 13,
    color: "#6b6b7b",
    margin: "24px 0 0 0",
  },
  switchButton: {
    background: "none",
    border: "none",
    color: "#a8a5ff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    textDecoration: "none",
  },
};
