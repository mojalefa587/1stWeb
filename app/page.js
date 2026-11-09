import { auth } from "@/auth";
import Dashboard from "@/components/dashboard";
import SignIn from "@/components/sign-in";

export default async function Home() {
  const providers = {
    discord: Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET),
    kick: Boolean(process.env.AUTH_KICK_ID && process.env.AUTH_KICK_SECRET),
  };
  const configured = Boolean(process.env.AUTH_SECRET);

  if (!configured) {
    return <SignIn providers={providers} setupRequired />;
  }

  const session = await auth();
  if (!session?.user?.id) {
    return <SignIn providers={providers} />;
  }

  return (
    <Dashboard
      displayName={session.user.name || "Viewer"}
      avatarUrl={session.user.image || ""}
      isAdmin={Boolean(process.env.RAFFLE_ADMIN_ID) && session.user.id === process.env.RAFFLE_ADMIN_ID}
    />
  );
}
