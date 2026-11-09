import { getSignedInUser, jsonError, requireSameOrigin } from "@/lib/server/session";
import { isSolanaAddress } from "@/lib/server/solana-address";
import { ensureProfile, getProviderFromUserId, getSupabaseAdmin } from "@/lib/server/supabase";

export async function PUT(request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
    const user = await getSignedInUser();
    if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });

    const body = await request.json();
    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!isSolanaAddress(address)) {
      return Response.json({ error: "Enter a valid Solana wallet address." }, { status: 400 });
    }

    const client = getSupabaseAdmin();
    await ensureProfile(client, user, getProviderFromUserId(user.id));
    const { error } = await client
      .from("profiles")
      .update({ solana_address: address, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) throw error;
    return Response.json({ wallet: address });
  } catch (error) {
    return jsonError(error, "PUT /api/wallet");
  }
}
