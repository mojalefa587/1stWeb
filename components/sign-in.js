"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowDown, ArrowRight, CalendarCheck, Coins, Gift, ShieldCheck, Ticket, Wallet } from "lucide-react";

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
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#rewards">How it works</a>
          <a href="#sign-in" className="landing-nav-cta">Sign in <ArrowRight size={13} /></a>
        </nav>
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

        <div className="signin-card" id="sign-in">
          <div className="card-kicker"><span className="status-dot" /> YOUR COMMUNITY, YOUR REWARDS</div>
          <h2>Get in the game.</h2>
          <p className="muted">Sign in with the account you use in chat.</p>
          {setupRequired && (
            <div className="notice">
              <strong>Sign-in setup is not finished yet</strong>
              <span>The site owner needs to add the authentication keys in Vercel before viewers can sign in.</span>
            </div>
          )}
          <div className="signin-actions">
            <button
              className="button button-kick"
              type="button"
              disabled={setupRequired || !providers.kick || busy !== ""}
              onClick={() => startSignIn("kick")}
            >
              <span className="kick-icon">K</span>
              {busy === "kick" ? "Connecting..." : "Continue with Kick"}
              <span className="button-arrow">↗</span>
            </button>
            <button
              className="button button-discord"
              type="button"
              disabled={setupRequired || !providers.discord || busy !== ""}
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
          {setupRequired && (
            <details className="setup-details">
              <summary>What still needs to be connected? <ArrowDown size={13} /></summary>
              <ol>
                <li>Create a Kick or Discord developer app.</li>
                <li>Add its client ID and secret to Vercel environment variables.</li>
                <li>Set <code>AUTH_SECRET</code> and redeploy.</li>
              </ol>
              <span>Setup guide: <strong>README.md</strong> in your GitHub repository.</span>
            </details>
          )}
          {message && <p className="form-message error-message">{message}</p>}
          <div className="secure-note"><span>◈</span> Your password is never shared with this site.</div>
          <div className="signin-foot"><span>01</span> SIGN IN <i /> <span>02</span> CHECK IN <i /> <span>03</span> WIN</div>
        </div>
      </section>

      <section className="landing-rewards" id="rewards">
        <div className="landing-section-heading">
          <p className="eyebrow"><span className="eyebrow-line" /> A LITTLE EVERY DAY ADDS UP</p>
          <h2>Your time in chat<br /><span>turns into chances.</span></h2>
          <p>Sign in once. Check in daily. Let your streak do the heavy lifting.</p>
        </div>
        <div className="landing-feature-grid">
          <article className="landing-feature">
            <span className="feature-icon"><CalendarCheck size={18} /></span>
            <span className="feature-step">01 / SHOW UP</span>
            <h3>Daily check-ins</h3>
            <p>Check in after 00:30 UTC+2 and collect 10 points. Miss a day and your streak starts fresh.</p>
            <div className="feature-callout"><span>DAILY</span><strong>+10 pts</strong></div>
          </article>
          <article className="landing-feature featured">
            <span className="feature-icon"><Coins size={18} /></span>
            <span className="feature-step">02 / KEEP GOING</span>
            <h3>Stack your streak</h3>
            <p>Stay consistent for seven consecutive days to earn an extra 60 points on top.</p>
            <div className="feature-callout"><span>7-DAY STREAK</span><strong>+60 pts</strong></div>
          </article>
          <article className="landing-feature">
            <span className="feature-icon"><Ticket size={18} /></span>
            <span className="feature-step">03 / TAKE A SHOT</span>
            <h3>Enter the raffle</h3>
            <p>Use 40 points per entry. Enter as many times as you can afford before month-end.</p>
            <div className="feature-callout"><span>PER ENTRY</span><strong>40 pts</strong></div>
          </article>
        </div>
        <div className="landing-bottom-row">
          <div className="landing-safety"><ShieldCheck size={17} /><span>Your wallet address is for prize payouts only. Never share your seed phrase.</span></div>
          <a className="landing-bottom-link" href="#sign-in">Get started <ArrowRight size={14} /></a>
        </div>
      </section>

      <footer className="landing-footer">
        <span>BUILT FOR THE COMMUNITY</span>
        <span><Wallet size={12} /> CHECK-IN RESETS DAILY AT 00:30 UTC+2</span>
      </footer>
    </main>
  );
}
