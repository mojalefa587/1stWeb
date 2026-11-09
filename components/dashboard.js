"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

const timeZone = "Africa/Johannesburg";

function formatMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone }).format(
    new Date(Date.UTC(year, monthNumber - 1, 15)),
  );
}

function formatCloseTime(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export default function Dashboard({ displayName, avatarUrl, isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load your dashboard.");
      setData(result);
      setWalletInput(result.user.wallet || "");
    } catch (requestError) {
      setError(requestError.message || "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submitAction(action, url, options = {}) {
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const response = await fetch(url, {
        method: options.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "That action could not be completed.");
      if (action === "wallet") setMessage("Solana wallet saved.");
      if (action === "checkin") setMessage(result.checkedIn ? `Check-in complete — +${result.pointsAwarded} points.` : "You’ve already checked in for today.");
      if (action === "entry") setMessage(`Entry #${result.entryNumber} added — 40 points used.`);
      if (action === "draw") setMessage(`Winner drawn: ${result.winnerName} · ${result.wallet}`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "That action could not be completed.");
    } finally {
      setBusy("");
    }
  }

  const user = data?.user;
  const raffle = data?.raffle;
  const canEnter = Boolean(user?.wallet) && (user?.points || 0) >= 40 && !raffle?.drawn;
  const drawReady = isAdmin && data?.previousRaffle && data.previousRaffle.entryCount > 0 && !data.previousRaffle.drawn;
  const streakProgress = (user?.streak ?? 0) % 7 || ((user?.streak ?? 0) > 0 ? 7 : 0);

  return (
    <main className="dashboard-page">
      <header className="topbar dashboard-topbar">
        <a className="brand" href="/" aria-label="1stWeb home">
          <span className="brand-mark">1</span>
          <span>FIRST<span className="brand-light">WEB</span></span>
        </a>
        <div className="user-nav">
          <span className="nav-points"><span className="coin">✳</span>{loading ? "—" : (user?.points ?? 0)} <small>PTS</small></span>
          <div className="user-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}
          </div>
          <span className="nav-name">{displayName}</span>
          <button className="signout-button" onClick={() => signOut({ redirectTo: "/" })}>Sign out</button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" /> YOUR VIEWER HUB</p>
            <h1>Good to see you, <span>{user?.name || displayName}.</span></h1>
            <p className="muted">Your daily check-in and monthly raffle, all in one place.</p>
          </div>
          <div className="streak-chip"><span>✦</span> {user?.streak ?? 0} DAY STREAK</div>
        </div>

        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {message && <div className="notice success-notice" role="status">{message}</div>}
        {loading && <div className="notice">Loading your secure rewards dashboard…</div>}
        {!loading && error.includes("Supabase is not configured") && (
          <div className="notice">
            <strong>Connect your Supabase project</strong>
            <span>Add the database values from <code>.env.example</code> to your local environment and Vercel, then run the SQL migration.</span>
          </div>
        )}

        <div className="dashboard-grid">
          <section className="panel checkin-panel">
            <div className="panel-topline"><span className="panel-icon">✦</span><span>DAILY CHECK-IN</span><span className="panel-tag">+10 PTS</span></div>
            <h2>Keep your streak alive.</h2>
            <p className="muted">Check in once a day after 00:30 UTC+2. Make it seven days in a row for a bonus.</p>
            <div className="streak-progress">
              <div className="progress-copy"><span>STREAK PROGRESS</span><strong>{streakProgress}/7 DAYS</strong></div>
              <div className="progress-track"><span style={{ width: `${streakProgress * 100 / 7}%` }} /></div>
              <div className="day-markers">
                {Array.from({ length: 7 }, (_, index) => (
                  <span className={index < streakProgress ? "day-marker reached" : "day-marker"} key={index}>
                    {index === 6 ? "+60" : `D${index + 1}`}
                  </span>
                ))}
              </div>
            </div>
            <button
              className={`button checkin-button ${data?.checkedInToday ? "button-done" : ""}`}
              disabled={loading || Boolean(error) || data?.checkedInToday || busy !== ""}
              onClick={() => submitAction("checkin", "/api/checkin")}
            >
              {busy === "checkin" ? "Checking in..." : data?.checkedInToday ? "✓  CHECKED IN TODAY" : "CHECK IN  ·  EARN 10 POINTS"}
            </button>
            <p className="card-footnote">DAILY RESET · 00:30 UTC+2</p>
          </section>

          <section className="panel raffle-panel">
            <div className="panel-topline"><span className="panel-icon raffle-icon">◉</span><span>MONTHLY RAFFLE</span><span className="panel-tag muted-tag">1 ENTRY · 40 PTS</span></div>
            <div className="raffle-title-row">
              <div><p className="raffle-month">{raffle ? formatMonth(raffle.month) : "This month"}</p><h2>Community draw</h2></div>
              <div className="raffle-ticket">✳</div>
            </div>
            <p className="muted">Use your points to enter. Enter more than once for more chances to win.</p>
            <div className="raffle-stats">
              <div><strong>{raffle?.entryCount ?? "—"}</strong><span>TOTAL ENTRIES</span></div>
              <div><strong>{raffle?.userEntries ?? 0}</strong><span>YOUR ENTRIES</span></div>
              <div><strong>40 <small>PTS</small></strong><span>PER ENTRY</span></div>
            </div>
            <button
              className="button raffle-button"
              disabled={loading || Boolean(error) || !canEnter || busy !== ""}
              onClick={() => submitAction("entry", "/api/raffle/entry")}
            >
              {busy === "entry" ? "Adding entry..." : !user?.wallet ? "ADD A WALLET TO ENTER" : !canEnter ? "NEED 40 POINTS TO ENTER" : "ENTER RAFFLE  ·  40 PTS"}
            </button>
            <p className="card-footnote">CLOSES {raffle?.closesAt ? formatCloseTime(raffle.closesAt) : "AT MONTH-END"} · UTC+2</p>
          </section>

          <section className="panel wallet-panel">
            <div className="panel-topline"><span className="panel-icon wallet-icon">↗</span><span>YOUR SOLANA WALLET</span><span className="panel-tag muted-tag">PAYOUT ADDRESS</span></div>
            <h2>Where rewards find you.</h2>
            <p className="muted">Add the Solana address where you want to receive prizes. Double-check it before saving.</p>
            <form
              className="wallet-form"
              onSubmit={(event) => {
                event.preventDefault();
                submitAction("wallet", "/api/wallet", { method: "PUT", body: { address: walletInput } });
              }}
            >
              <label className="sr-only" htmlFor="wallet-address">Solana wallet address</label>
              <input
                id="wallet-address"
                value={walletInput}
                onChange={(event) => setWalletInput(event.target.value)}
                placeholder="Paste your Solana address"
                autoComplete="off"
                spellCheck="false"
              />
              <button className="button wallet-button" disabled={loading || busy !== "" || walletInput === user?.wallet}>
                {busy === "wallet" ? "Saving..." : user?.wallet ? "UPDATE WALLET" : "SAVE WALLET"}
              </button>
            </form>
            <p className="card-footnote">WE WILL NEVER ASK FOR YOUR SEED PHRASE OR PRIVATE KEY.</p>
          </section>

          {isAdmin && (
            <section className="panel admin-panel">
              <div className="panel-topline"><span className="panel-icon">⚑</span><span>STREAMER CONTROLS</span><span className="panel-tag">ADMIN</span></div>
              <h2>Monthly draw</h2>
              {data?.previousRaffle ? (
                <>
                  <p className="muted">{formatMonth(data.previousRaffle.month)} · {data.previousRaffle.entryCount} entries</p>
                  {data.previousRaffle.winner && (
                    <p className="winner-result">Winner: <strong>{data.previousRaffle.winner.name}</strong><br />Wallet: <code>{data.previousRaffle.winner.wallet}</code></p>
                  )}
                  {drawReady && (
                    <button className="button raffle-button" disabled={busy !== ""} onClick={() => submitAction("draw", "/api/raffle/draw", { body: { month: data.previousRaffle.month } })}>
                      {busy === "draw" ? "Drawing..." : `DRAW ${formatMonth(data.previousRaffle.month).toUpperCase()} WINNER`}
                    </button>
                  )}
                  {data.previousRaffle.drawn && <p className="card-footnote">THIS MONTH HAS ALREADY BEEN DRAWN.</p>}
                </>
              ) : (
                <p className="muted">No previous-month raffle entries to draw.</p>
              )}
            </section>
          )}
        </div>
        <footer className="dashboard-footer"><span>1STWEB · VIEWER REWARDS</span><span>POINTS HAVE NO CASH VALUE · PRIZES PAID BY THE STREAMER</span></footer>
      </section>
    </main>
  );
}
