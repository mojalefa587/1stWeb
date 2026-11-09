import { getSignedInUser, jsonError, requireSameOrigin } from "@/lib/server/session";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function POST(request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
    const user = await getSignedInUser();
    if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });
    if (!process.env.RAFFLE_ADMIN_ID || user.id !== process.env.RAFFLE_ADMIN_ID) {
      return Response.json({ error: "Only the site owner can draw the raffle." }, { status: 403 });
    }

    const body = await request.json();
    if (typeof body.month !== "string" || !/^\d{4}-\d{2}$/.test(body.month)) {
      return Response.json({ error: "Select a valid raffle month." }, { status: 400 });
    }

    const client = getSupabaseAdmin();
    const { data, error } = await client.rpc("draw_monthly_raffle", {
      p_month: body.month,
    });
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return jsonError(error, "POST /api/raffle/draw");
  }
}
