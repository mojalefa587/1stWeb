import { getSignedInUser, jsonError, requireSameOrigin } from "@/lib/server/session";
import { ensureProfile, getProviderFromUserId, getSupabaseAdmin } from "@/lib/server/supabase";

export async function POST(request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
    const user = await getSignedInUser();
    if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });

    const client = getSupabaseAdmin();
    await ensureProfile(client, user, getProviderFromUserId(user.id));
    const { data, error } = await client.rpc("claim_daily_checkin", {
      p_user_id: user.id,
    });
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return jsonError(error, "POST /api/checkin");
  }
}
