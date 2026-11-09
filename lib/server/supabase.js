import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Add the project URL and service role key.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function ensureProfile(client, user, provider) {
  const { data: existing, error: readError } = await client
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return;

  const { error } = await client.from("profiles").insert({
    user_id: user.id,
    provider,
    display_name: user.name || "Viewer",
    avatar_url: user.image || null,
  });
  if (error && error.code !== "23505") throw error;
}

export function getProviderFromUserId(userId) {
  const provider = userId.split(":", 1)[0];
  if (provider !== "discord" && provider !== "kick") {
    throw new Error("Unsupported sign-in provider.");
  }
  return provider;
}
