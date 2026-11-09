"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignIn({ providers, setupRequired = false }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function startSignIn(provider) {
    setBusy(provider);
    setMessage("");
    try {
      await signIn(provider, { redirectTo: "/" });
    } catch {
      setMessage("Sign-in could not start. Check the provider settings and try again.");
      setBusy("");
    }
  }

  return (
    <main className="landing">
      <header className="topbar">
        <a className="brand" href="/" aria-label="1stWeb home">
          <span className="brand-mark">1</span>
          <span>FIRST<span className="brand-light">WEB</span></span>
        </a>
        <span className="live-pill"><span /> VIEWER REWARDS</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> THE STREAMER COMMUNITY HUB</p>
          <h1>Show up.<br /><span>Stack points.</span><br />Get rewarded.</h1>
          <p className="hero-description">
            Check in every day, build your streak, and put your points toward
            the monthly community raffle.
          </p>
          <div className="hero-rule">
            <div className="rule-item"><strong>10</strong><span>POINTS<br />PER CHECK-IN</span></div>
            <div className="rule-divider" />
            <div className="rule-item"><strong>+60</strong><span>STREAK<br />BONUS / 7 DAYS</span></div>
            <div className="rule-divider" />
            <div className="rule-item"><strong>40</strong><span>POINTS<br />PER ENTRY</span></div>
          </div>
        </div>

        <div className="signin-card">
          <div className="card-kicker"><span className="status-dot" /> YOUR COMMUNITY, YOUR REWARDS</div>
          <h2>Get in the game.</h2>
          <p className="muted">Sign in with the account you use in chat.</p>
          {setupRequired && (
            <div className="notice">
              <strong>Authentication setup needed</strong>
              <span>Add the auth environment variables from <code>.env.example</code> to enable sign-in.</span>
            </div>
          )}
          <div className="signin-actions">
            <button
              className="button button-kick"
              type="button"
              disabled={!providers.kick || busy !== ""}
              onClick={() => startSignIn("kick")}
            >
              <span className="kick-icon">K</span>
              {busy === "kick" ? "Connecting..." : "Continue with Kick"}
              <span className="button-arrow">↗</span>
            </button>
            <button
              className="button button-discord"
              type="button"
              disabled={!providers.discord || busy !== ""}
              onClick={() => startSignIn("discord")}
            >
              <span className="discord-icon">◈</span>
              {busy === "discord" ? "Connecting..." : "Continue with Discord"}
              <span className="button-arrow">↗</span>
            </button>
          </div>
          {!setupRequired && (!providers.kick || !providers.discord) && (
            <p className="setup-hint">
              {!providers.kick && !providers.discord
                ? "Add provider credentials in your environment to enable sign-in."
                : `Sign-in with ${!providers.kick ? "Kick" : "Discord"} will be available after its credentials are configured.`}
            </p>
          )}
          {message && <p className="form-message error-message">{message}</p>}
          <div className="secure-note"><span>◈</span> Your password is never shared with this site.</div>
          <div className="signin-foot"><span>01</span> SIGN IN <i /> <span>02</span> CHECK IN <i /> <span>03</span> WIN</div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>BUILT FOR THE COMMUNITY</span>
        <span>CHECK-IN RESETS DAILY AT 00:30 UTC+2</span>
      </footer>
    </main>
  );
}
