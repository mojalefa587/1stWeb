"use client";

import { signOut } from "next-auth/react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coins,
  Gift,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const timeZone = "Africa/Johannesburg";

const navItems = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "raffle", label: "Monthly raffle", icon: Ticket },
  { id: "activity", label: "Points activity", icon: Activity },
  { id: "profile", label: "My account", icon: Wallet },
];

const transactionLabels = {
  daily_checkin: "Daily check-in",
  seven_day_streak: "7-day streak bonus",
  raffle_entry: "Raffle entry",
};

function formatMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone }).format(
    new Date(Date.UTC(year, monthNumber - 1, 15)),
  );
}

function formatDate(value, options = { dateStyle: "medium", timeStyle: "short" }) {
  return new Intl.DateTimeFormat("en", { ...options, timeZone }).format(new Date(value));
}

function Avatar({ name, image, size = "normal" }) {
  return (
    <span className={`user-avatar ${size === "large" ? "user-avatar-large" : ""}`}>
      {image ? <img src={image} alt="" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

function TransactionList({ transactions, compact = false }) {
  if (!transactions?.length) {
    return (
      <div className="empty-activity">
        <span className="empty-activity-icon"><Activity size={18} /></span>
        <strong>No points activity yet</strong>
        <span>Check in to start building your rewards history.</span>
      </div>
    );
  }

  return (
    <div className={`transaction-list ${compact ? "transaction-list-compact" : ""}`}>
      {transactions.map((transaction) => {
        const positive = transaction.amount > 0;
        const Icon = positive ? ArrowDownLeft : ArrowUpRight;
        return (
          <div className="transaction-row" key={transaction.id}>
            <span className={`transaction-icon ${positive ? "transaction-positive" : "transaction-negative"}`}>
              <Icon size={16} />
            </span>
            <span className="transaction-info">
              <strong>{transactionLabels[transaction.reason] || "Points update"}</strong>
              <span>{formatDate(transaction.createdAt)}</span>
            </span>
            <strong className={`transaction-amount ${positive ? "amount-positive" : ""}`}>
              {positive ? "+" : ""}{transaction.amount}
              <small>PTS</small>
            </strong>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard({ displayName, avatarUrl, isAdmin, provider }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmEntry, setConfirmEntry] = useState(false);

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
      if (action === "entry") {
        setMessage(`Entry #${result.entryNumber} added — 40 points used.`);
        setConfirmEntry(false);
      }
      if (action === "draw") setMessage(`Winner drawn: ${result.winnerName} · ${result.wallet}`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "That action could not be completed.");
    } finally {
      setBusy("");
    }
  }

  function navigate(tab) {
    setActiveTab(tab);
    setMenuOpen(false);
    setMessage("");
  }

  const user = data?.user;
  const raffle = data?.raffle;
  const canEnter = Boolean(user?.wallet) && (user?.points || 0) >= 40 && !raffle?.drawn;
  const drawReady = isAdmin && data?.previousRaffle && data.previousRaffle.entryCount > 0 && !data.previousRaffle.drawn;
  const streakProgress = (user?.streak ?? 0) % 7 || ((user?.streak ?? 0) > 0 ? 7 : 0);

  function renderCheckinCard() {
    return (
      <section className="panel checkin-panel">
        <div className="panel-topline"><span className="panel-icon"><CalendarCheck size={16} /></span><span>DAILY CHECK-IN</span><span className="panel-tag">+10 PTS</span></div>
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
          {busy === "checkin" ? "Checking in..." : data?.checkedInToday ? <><Check size={16} /> CHECKED IN TODAY</> : "CHECK IN  ·  EARN 10 POINTS"}
        </button>
        <p className="card-footnote">DAILY RESET · 00:30 UTC+2</p>
      </section>
    );
  }

  function renderRaffleCard(compact = false) {
    return (
      <section className={`panel raffle-panel ${compact ? "raffle-panel-compact" : ""}`}>
        <div className="panel-topline"><span className="panel-icon raffle-icon"><Ticket size={16} /></span><span>MONTHLY RAFFLE</span><span className="panel-tag muted-tag">1 ENTRY · 40 PTS</span></div>
        <div className="raffle-title-row">
          <div><p className="raffle-month">{raffle ? formatMonth(raffle.month) : "This month"}</p><h2>Community draw</h2></div>
          <div className="raffle-ticket"><Gift size={22} /></div>
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
          onClick={() => setConfirmEntry(true)}
        >
          {busy === "entry" ? "Adding entry..." : !user?.wallet ? "ADD A WALLET TO ENTER" : !canEnter ? "NEED 40 POINTS TO ENTER" : "ENTER RAFFLE  ·  40 PTS"}
        </button>
        <p className="card-footnote">CLOSES {raffle?.closesAt ? formatDate(raffle.closesAt) : "AT MONTH-END"} · UTC+2</p>
      </section>
    );
  }

  function renderWalletCard() {
    return (
      <section className="panel wallet-panel">
        <div className="panel-topline"><span className="panel-icon wallet-icon"><Wallet size={16} /></span><span>YOUR SOLANA WALLET</span><span className="panel-tag muted-tag">PAYOUT ADDRESS</span></div>
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
    );
  }

  function renderOverview() {
    return (
      <>
        <div className="welcome-banner">
          <div>
            <span className="welcome-kicker"><Sparkles size={14} /> YOUR COMMUNITY REWARDS</span>
            <h2>Every day counts, <span>{user?.name || displayName}.</span></h2>
            <p>Check in, keep your streak, and turn your points into another chance to win.</p>
          </div>
          <div className="welcome-streak"><span>✦</span><strong>{user?.streak ?? 0}</strong><small>DAY STREAK</small></div>
        </div>

        <div className="stats-row">
          <article className="stat-card">
            <span className="stat-icon"><Coins size={17} /></span>
            <span className="stat-label">YOUR POINTS</span>
            <strong>{loading ? "—" : (user?.points ?? 0)}</strong>
            <button onClick={() => navigate("activity")}>View activity <ArrowRight size={13} /></button>
          </article>
          <article className="stat-card">
            <span className="stat-icon"><CalendarCheck size={17} /></span>
            <span className="stat-label">CHECK-IN STATUS</span>
            <strong className="stat-word">{data?.checkedInToday ? "Complete" : "Ready"}</strong>
            <button onClick={() => document.getElementById("daily-checkin")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              {data?.checkedInToday ? "See your streak" : "Check in today"} <ArrowRight size={13} />
            </button>
          </article>
          <article className="stat-card">
            <span className="stat-icon"><Ticket size={17} /></span>
            <span className="stat-label">RAFFLE ENTRIES</span>
            <strong>{raffle?.userEntries ?? 0}</strong>
            <button onClick={() => navigate("raffle")}>Explore raffle <ArrowRight size={13} /></button>
          </article>
        </div>

        <div className="section-title-row"><div><p className="eyebrow"><span className="eyebrow-line" /> YOUR REWARDS</p><h2>Make today count.</h2></div></div>
        <div className="dashboard-grid">
          <div id="daily-checkin">{renderCheckinCard()}</div>
          <div>{renderRaffleCard(true)}</div>
          <div className="overview-activity panel">
            <div className="activity-heading"><div><span className="panel-icon"><Activity size={16} /></span><h2>Recent activity</h2></div><button className="text-button" onClick={() => navigate("activity")}>See all <ChevronRight size={14} /></button></div>
            <TransactionList transactions={data?.transactions?.slice(0, 4)} compact />
          </div>
          <div>{renderWalletCard()}</div>
        </div>
        {isAdmin && renderAdminCard()}
      </>
    );
  }

  function renderRafflePage() {
    return (
      <div className="feature-page">
        <div className="section-title-row">
          <div><p className="eyebrow"><span className="eyebrow-line" /> MORE CHANCES TO WIN</p><h2>Monthly raffle</h2><p className="muted">Every entry counts. Use your earned points for a shot at the monthly prize.</p></div>
          <span className="panel-tag">DRAWN AFTER MONTH-END</span>
        </div>
        <div className="raffle-feature-grid">
          <div className="raffle-feature-main">
            {renderRaffleCard()}
            <section className="panel raffle-how">
              <div className="panel-topline"><span className="panel-icon"><CircleHelp size={16} /></span><span>HOW IT WORKS</span></div>
              <div className="raffle-steps">
                <div><span>01</span><strong>Earn points</strong><p>Check in each day. Build a seven-day streak for a 60-point bonus.</p></div>
                <div><span>02</span><strong>Get your wallet ready</strong><p>Save your Solana payout address in My account before entering.</p></div>
                <div><span>03</span><strong>Enter the draw</strong><p>Each entry uses 40 points and gives you one chance to win.</p></div>
                <div><span>04</span><strong>Wait for the draw</strong><p>Entries close at month-end. The streamer draws and pays the winner.</p></div>
              </div>
            </section>
          </div>
          <aside className="raffle-side">
            <section className="panel raffle-side-card">
              <div className="panel-topline"><span className="panel-icon"><Clock3 size={16} /></span><span>THIS MONTH</span></div>
              <strong className="side-month">{raffle ? formatMonth(raffle.month) : "Loading..."}</strong>
              <p className="muted">The draw happens after the month closes. You can enter as many times as your points allow.</p>
              <div className="side-count"><Ticket size={17} /><span><strong>{raffle?.entryCount ?? "—"}</strong> entries so far</span></div>
              <button className="text-button" onClick={() => navigate("activity")}>See your points history <ArrowRight size={14} /></button>
            </section>
            <section className="panel safety-card">
              <ShieldCheck size={19} />
              <strong>Wallet safety</strong>
              <p>Your public wallet address is only used for payouts. Never share your seed phrase or private key.</p>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  function renderActivityPage() {
    const earned = (data?.transactions || []).filter((transaction) => transaction.amount > 0).reduce((sum, item) => sum + item.amount, 0);
    const spent = Math.abs((data?.transactions || []).filter((transaction) => transaction.amount < 0).reduce((sum, item) => sum + item.amount, 0));
    return (
      <div className="feature-page">
        <div className="section-title-row">
          <div><p className="eyebrow"><span className="eyebrow-line" /> YOUR POINTS, ACCOUNTED FOR</p><h2>Points activity</h2><p className="muted">A clear history of the points you’ve earned and spent.</p></div>
          <div className="activity-balance"><Coins size={18} /><strong>{user?.points ?? 0}</strong><span>AVAILABLE POINTS</span></div>
        </div>
        <div className="activity-summary">
          <div><span>TOTAL EARNED</span><strong>+{earned} <small>PTS</small></strong></div>
          <div><span>TOTAL SPENT</span><strong>{spent} <small>PTS</small></strong></div>
          <div><span>RAFFLE ENTRIES</span><strong>{raffle?.userEntries ?? 0}</strong></div>
        </div>
        <section className="panel activity-table">
          <div className="activity-heading"><div><span className="panel-icon"><Activity size={16} /></span><h2>All recent transactions</h2></div><span className="panel-tag muted-tag">LATEST 12</span></div>
          <TransactionList transactions={data?.transactions} />
        </section>
        <p className="activity-note"><ShieldCheck size={15} /> Points are recorded securely and can’t be changed from your browser.</p>
      </div>
    );
  }

  function renderProfilePage() {
    return (
      <div className="feature-page">
        <div className="section-title-row">
          <div><p className="eyebrow"><span className="eyebrow-line" /> YOUR ACCOUNT</p><h2>Profile & payout</h2><p className="muted">Manage how you appear in the community and where prizes should go.</p></div>
        </div>
        <div className="profile-grid">
          <section className="panel profile-card">
            <div className="profile-identity"><Avatar name={user?.name || displayName} image={user?.image || avatarUrl} size="large" /><div><span className="stat-label">SIGNED IN WITH</span><strong>{provider === "kick" ? "Kick" : "Discord"}</strong><span className="muted">Account: {user?.name || displayName}</span></div></div>
            <div className="profile-divider" />
            <div className="profile-stat-list"><div><span>Available points</span><strong>{user?.points ?? 0} pts</strong></div><div><span>Current streak</span><strong>{user?.streak ?? 0} days</strong></div><div><span>Raffle entries this month</span><strong>{raffle?.userEntries ?? 0}</strong></div></div>
          </section>
          {renderWalletCard()}
          <section className="panel account-safety">
            <ShieldCheck size={20} />
            <div><strong>Your account stays yours</strong><p>We use your Kick or Discord identity to save your rewards. We never see your sign-in password, and we never ask for your wallet’s private key.</p></div>
          </section>
        </div>
      </div>
    );
  }

  function renderAdminCard() {
    return (
      <section className="panel admin-panel">
        <div className="panel-topline"><span className="panel-icon"><ShieldCheck size={16} /></span><span>STREAMER CONTROLS</span><span className="panel-tag">ADMIN</span></div>
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
    );
  }

  const titles = {
    overview: ["Your rewards overview", "Your community rewards, all in one place."],
    raffle: ["Monthly raffle", "Spend your points. Get another chance to win."],
    activity: ["Points activity", "Every point earned and spent, in one place."],
    profile: ["My account", "Your profile and payout preferences."],
  };

  return (
    <main className="dashboard-page">
      <header className="topbar dashboard-topbar">
        <a className="brand" href="/" aria-label="1stWeb home">
          <span className="brand-mark">1</span>
          <span>FIRST<span className="brand-light">WEB</span></span>
        </a>
        <div className="user-nav">
          <span className="nav-points"><span className="coin">✳</span>{loading ? "—" : (user?.points ?? 0)} <small>PTS</small></span>
          <Avatar name={displayName} image={avatarUrl} />
          <span className="nav-name">{displayName}</span>
          <button className="signout-button" onClick={() => signOut({ redirectTo: "/" })}><LogOut size={14} /><span>Sign out</span></button>
          <button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      <div className="dashboard-shell">
        <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
          <span className="sidebar-label">YOUR SPACE</span>
          <nav className="sidebar-nav" aria-label="Dashboard">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button className={`nav-item ${activeTab === id ? "nav-item-active" : ""}`} key={id} onClick={() => navigate(id)}>
                <Icon size={17} /><span>{label}</span>{activeTab === id && <ChevronRight size={14} className="nav-chevron" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-streak"><span className="streak-sparkle"><Sparkles size={15} /></span><div><span>YOUR STREAK</span><strong>{user?.streak ?? 0} days</strong></div></div>
            <button className="sidebar-help" onClick={() => navigate("raffle")}><CircleHelp size={15} /> How rewards work</button>
          </div>
        </aside>

        <section className="dashboard-content">
          <div className="dashboard-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" /> {titles[activeTab][0].toUpperCase()}</p>
              <h1>{titles[activeTab][0]}</h1>
              <p className="muted">{titles[activeTab][1]}</p>
            </div>
            <div className="streak-chip"><span>✦</span> {user?.streak ?? 0} DAY STREAK</div>
          </div>

          {error && <div className="notice error-notice" role="alert">{error}</div>}
          {message && <div className="notice success-notice" role="status">{message}</div>}
          {loading && <div className="notice">Loading your secure rewards dashboard…</div>}
          {!loading && error.includes("Supabase is not configured") && (
            <div className="notice"><strong>Connect your Supabase project</strong><span>Add the database values from <code>.env.example</code> to your local environment and Vercel, then run the SQL migration.</span></div>
          )}

          <div className="tab-content" key={activeTab}>
            {activeTab === "overview" && renderOverview()}
            {activeTab === "raffle" && renderRafflePage()}
            {activeTab === "activity" && renderActivityPage()}
            {activeTab === "profile" && renderProfilePage()}
          </div>
          <footer className="dashboard-footer"><span>1STWEB · VIEWER REWARDS</span><span>POINTS HAVE NO CASH VALUE · PRIZES PAID BY THE STREAMER</span></footer>
        </section>
      </div>

      {confirmEntry && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmEntry(false); }}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="entry-title">
            <button className="modal-close" onClick={() => setConfirmEntry(false)} aria-label="Cancel entry"><X size={18} /></button>
            <span className="modal-icon"><Ticket size={22} /></span>
            <p className="eyebrow">CONFIRM YOUR ENTRY</p>
            <h2 id="entry-title">One more chance to win?</h2>
            <p className="muted">This will use <strong>40 points</strong> from your balance. Your entry will be included in the {raffle ? formatMonth(raffle.month) : "monthly"} draw.</p>
            <div className="modal-balance"><span>Points after entry</span><strong>{(user?.points || 0) - 40} PTS</strong></div>
            <button className="button raffle-button" disabled={busy !== ""} onClick={() => submitAction("entry", "/api/raffle/entry")}>
              {busy === "entry" ? "Adding your entry..." : "CONFIRM ENTRY  ·  40 PTS"}
            </button>
            <button className="modal-cancel" onClick={() => setConfirmEntry(false)}>Not now</button>
          </section>
        </div>
      )}
    </main>
  );
}
