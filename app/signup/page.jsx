"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import "../auth.css";

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginImages, setLoginImages] = useState([]);
  const [countdown, setCountdown] = useState(0); // seconds remaining for resend
  const [resendDisabled, setResendDisabled] = useState(false);
  const otpRefs = useRef([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.loginImages) {
          let parsed = [];
          try {
            parsed =
              typeof data.settings.loginImages === "string"
                ? JSON.parse(data.settings.loginImages)
                : data.settings.loginImages;
          } catch (e) {
            parsed = [data.settings.loginImages];
          }
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLoginImages(parsed);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const startResendTimer = () => {
    setResendDisabled(true);
    setCountdown(60); // 60 second cooldown between resends
  };

  // Step 1: validate form and send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send verification code");
        setLoading(false);
        return;
      }
      setStep("otp");
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendDisabled) return;
    setError("");
    setOtp(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend code");
      } else {
        startResendTimer();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // Step 2: verify OTP and create account
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created! Please log in.");
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fallbackImages = [
    "/demo/abstract.svg",
    "/demo/cyber.svg",
    "/demo/monochrome.svg",
    "/demo/abstract.svg",
    "/demo/fantasy.svg",
    "/demo/landscape.svg",
    "/demo/portrait.svg",
  ];
  const getImg = (idx) => {
    const sourceArray = loginImages.length > 0 ? loginImages : fallbackImages;
    return sourceArray[idx % sourceArray.length];
  };
  const renderScrollImage = (idx) => (
    <Image
      key={idx}
      src={getImg(idx)}
      className="scroll-img"
      alt="AI artwork preview"
      width={180}
      height={240}
      loading="lazy"
      style={{ objectFit: "cover" }}
    />
  );

  const maskEmail = (em) => {
    const [user, domain] = em.split("@");
    if (!domain) return em;
    const visible = user.slice(0, 2);
    const masked = "*".repeat(Math.max(0, user.length - 2));
    return `${visible}${masked}@${domain}`;
  };

  return (
    <>
      <div className="auth-container">
        {/* Left Scrolling Tilted Images */}
        <div className="auth-side left">
          <div className="scroll-track-wrapper">
            <div className="scroll-track">{[0, 1, 2, 3, 4, 5].map(renderScrollImage)}</div>
            <div className="scroll-track reverse">{[6, 7, 8, 9, 10, 11].map(renderScrollImage)}</div>
            <div className="scroll-track">{[12, 13, 14, 15, 16, 17].map(renderScrollImage)}</div>
          </div>
        </div>

        {/* Center Card */}
        <div className="auth-center">
          <div className="auth-card">
            <div className="auth-logo">
              <BrandLogo height={38} priority />
            </div>

            {step === "form" ? (
              <>
                <h1 className="auth-title">
                  Create your account<span className="auth-title-dot">.</span>
                </h1>
                <p className="auth-subtitle">
                  Join thousands of creators using the world&apos;s best AI prompts.
                </p>

                {error && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", color: "#DC2626", fontSize: "0.9rem", fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                <form className="auth-form" onSubmit={handleSendOtp}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">Full Name</label>
                    <div className="form-input-container">
                      <input type="text" id="name" className="form-input" placeholder="Your Name" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="email">Email address</label>
                    <div className="form-input-container">
                      <input type="email" id="email" className="form-input" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <div className="form-input-container">
                      <input type={showPassword ? "text" : "password"} id="password" className="form-input password-input" placeholder="••••••••••" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                      <div className="password-toggle" onClick={() => setShowPassword(!showPassword)} style={{ cursor: "pointer" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                    <div className="form-input-container">
                      <input type={showPassword ? "text" : "password"} id="confirmPassword" className="form-input password-input" placeholder="••••••••••" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>

                  <button type="submit" className="auth-btn-primary" disabled={loading}>
                    {loading ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        Sending code...
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        Send Verification Code
                      </span>
                    )}
                  </button>
                </form>

                <div className="auth-footer-link">
                  Already have an account?{" "}
                  <Link href="/login">
                    Sign in{" "}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "2px", verticalAlign: "text-bottom" }}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </Link>
                </div>

                <div className="auth-tos">
                  By joining, you agree to our <Link href="/terms">Terms of Service</Link>.
                </div>
              </>
            ) : (
              <>
                {/* Step 2 — OTP Verification */}
                <div style={{ textAlign: "center", marginBottom: "8px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", background: "linear-gradient(135deg, #640DF0, #FE42B4)", borderRadius: "16px", marginBottom: "16px" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                </div>

                <h1 className="auth-title" style={{ textAlign: "center", fontSize: "1.6rem" }}>
                  Check your email<span className="auth-title-dot">.</span>
                </h1>
                <p className="auth-subtitle" style={{ textAlign: "center" }}>
                  We sent a 6-digit code to{" "}
                  <strong style={{ color: "var(--text-main)" }}>{maskEmail(email)}</strong>
                </p>

                {error && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", color: "#DC2626", fontSize: "0.9rem", fontWeight: 500, textAlign: "center" }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerify} style={{ marginTop: "28px" }}>
                  {/* OTP Boxes */}
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "28px" }}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        style={{
                          width: "48px",
                          height: "60px",
                          textAlign: "center",
                          fontSize: "1.6rem",
                          fontWeight: "800",
                          fontFamily: "monospace",
                          background: "var(--bg-light)",
                          border: `2px solid ${digit ? "var(--brand-accent)" : "var(--border-light)"}`,
                          borderRadius: "12px",
                          color: "var(--text-main)",
                          outline: "none",
                          transition: "border-color 0.15s ease",
                          caretColor: "var(--brand-accent)",
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="auth-btn-primary"
                    disabled={loading || otp.join("").length < 6}
                  >
                    {loading ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        Verifying...
                      </span>
                    ) : (
                      "Verify & Create Account"
                    )}
                  </button>
                </form>

                {/* Resend + Back */}
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Didn&apos;t receive it?{" "}
                    <button
                      onClick={handleResend}
                      disabled={resendDisabled || loading}
                      style={{
                        background: "none",
                        border: "none",
                        color: resendDisabled ? "var(--text-muted)" : "var(--brand-accent)",
                        fontWeight: 600,
                        cursor: resendDisabled ? "not-allowed" : "pointer",
                        fontSize: "0.9rem",
                        padding: 0,
                      }}
                    >
                      {resendDisabled ? `Resend in ${countdown}s` : "Resend code"}
                    </button>
                  </p>
                  <button
                    onClick={() => { setStep("form"); setError(""); setOtp(["", "", "", "", "", ""]); }}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer", marginTop: "8px", display: "flex", alignItems: "center", gap: "4px", margin: "8px auto 0" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
                    Back to sign up
                  </button>
                </div>

                <div className="auth-tos" style={{ marginTop: "20px" }}>
                  By joining, you agree to our <Link href="/terms">Terms of Service</Link>.
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Scrolling Tilted Images */}
        <div className="auth-side right">
          <div className="scroll-track-wrapper">
            <div className="scroll-track reverse">{[18, 19, 20, 21, 22, 23].map(renderScrollImage)}</div>
            <div className="scroll-track">{[24, 25, 26, 27, 28, 29].map(renderScrollImage)}</div>
            <div className="scroll-track reverse">{[30, 31, 32, 33, 34, 35].map(renderScrollImage)}</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
