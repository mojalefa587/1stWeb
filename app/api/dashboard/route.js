import { getCheckinDay, getPreviousLocalMonth, getRaffleMonth } from "@/lib/local-time";
import { getSignedInUser, jsonError } from "@/lib/server/session";
import { ensureProfile, getProviderFromUserId, getSupabaseAdmin } from "@/lib/server/supabase";

function monthClose(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 1) - 2 * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  try {
    const user = await getSignedInUser();
    if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });

    const client = getSupabaseAdmin();
    await ensureProfile(client, user, getProviderFromUserId(user.id));
    const day = getCheckinDay();
    const { month } = getRaffleMonth();
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("display_name, avatar_url, solana_address, points, current_streak, last_checkin")
      .eq("user_id", user.id)
      .single();
    if (profileError) throw profileError;

    const { data: todayCheckin, error: checkinError } = await client
      .from("checkins")
      .select("checkin_date")
      .eq("user_id", user.id)
      .eq("checkin_date", day)
      .maybeSingle();
    if (checkinError) throw checkinError;

    const { data: currentRaffle, error: raffleError } = await client
      .from("raffles")
      .select("id, raffle_month, closes_at, drawn_at, winner_entry_id")
      .eq("raffle_month", month)
      .maybeSingle();
    if (raffleError) throw raffleError;

    let raffle = {
      month,
      closesAt: monthClose(month),
      entryCount: 0,
      userEntries: 0,
      drawn: false,
    };
    if (currentRaffle) {
      const { count, error: countError } = await client
        .from("raffle_entries")
        .select("entry_number", { count: "exact", head: true })
        .eq("raffle_id", currentRaffle.id);
      if (countError) throw countError;

      const { count: userEntries, error: userCountError } = await client
        .from("raffle_entries")
        .select("entry_number", { count: "exact", head: true })
        .eq("raffle_id", currentRaffle.id)
        .eq("user_id", user.id);
      if (userCountError) throw userCountError;
      raffle = {
        ...raffle,
        closesAt: currentRaffle.closes_at,
        entryCount: count || 0,
        userEntries: userEntries || 0,
        drawn: Boolean(currentRaffle.drawn_at),
      };
    }

    let previousRaffle = null;
    if (process.env.RAFFLE_ADMIN_ID === user.id) {
      const previousMonth = getPreviousLocalMonth();
      const { data: previous, error: previousError } = await client
        .from("raffles")
        .select("id, drawn_at, winner_entry_id, winner_wallet")
        .eq("raffle_month", previousMonth)
        .maybeSingle();
      if (previousError) throw previousError;
      if (previous) {
        const { count, error: countError } = await client
          .from("raffle_entries")
          .select("entry_number", { count: "exact", head: true })
          .eq("raffle_id", previous.id);
        if (countError) throw countError;

        let winner = null;
        if (previous.winner_entry_id) {
          const { data: winningEntry, error: winnerError } = await client
            .from("raffle_entries")
            .select("user_id")
            .eq("entry_number", previous.winner_entry_id)
            .single();
          if (winnerError) throw winnerError;
          const { data: winnerProfile, error: winnerProfileError } = await client
            .from("profiles")
            .select("display_name")
            .eq("user_id", winningEntry.user_id)
            .single();
          if (winnerProfileError) throw winnerProfileError;
          winner = {
            name: winnerProfile.display_name,
            wallet: previous.winner_wallet,
          };
        }
        previousRaffle = {
          month: previousMonth,
          entryCount: count || 0,
          drawn: Boolean(previous.drawn_at),
          winner,
        };
      }
    }

    return Response.json({
      user: {
        name: profile.display_name,
        image: profile.avatar_url,
        wallet: profile.solana_address,
        points: profile.points,
        streak: profile.current_streak,
      },
      checkedInToday: Boolean(todayCheckin),
      raffle,
      previousRaffle,
    });
  } catch (error) {
    return jsonError(error, "GET /api/dashboard");
  }
}
