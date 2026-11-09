import "server-only";
import { auth } from "@/auth";

export async function getSignedInUser() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;

  return {
    id: user.id,
    name: user.name || "Viewer",
    image: user.image || null,
    provider: user.id.split(":", 1)[0],
  };
}

export function requireSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return Response.json({ error: "This request was blocked. Refresh the page and try again." }, { status: 403 });
  }
  return null;
}

export function jsonError(error, label, status = 500) {
  console.error(`[${label}]`, error);
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return Response.json({ error: message }, { status });
}
