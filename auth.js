import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

const kick = {
  id: "kick",
  name: "Kick",
  type: "oauth",
  clientId: process.env.AUTH_KICK_ID,
  clientSecret: process.env.AUTH_KICK_SECRET,
  authorization: {
    url: "https://id.kick.com/oauth/authorize",
    params: { scope: "user:read", response_type: "code" },
  },
  token: {
    url: "https://id.kick.com/oauth/token",
    params: { grant_type: "authorization_code" },
  },
  userinfo: {
    url: "https://api.kick.com/public/v1/users",
    async request({ tokens }) {
      const response = await fetch("https://api.kick.com/public/v1/users", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Kick could not verify this account.");
      }

      const result = await response.json();
      const user = result.data?.[0];
      if (!user?.user_id) {
        throw new Error("Kick did not return a user profile.");
      }
      return user;
    },
  },
  client: { token_endpoint_auth_method: "client_secret_post" },
  checks: ["pkce", "state"],
  profile(profile) {
    return {
      id: String(profile.user_id),
      name: profile.name || "Kick viewer",
      image: profile.profile_picture || null,
    };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Discord, kick],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.uid = `${account.provider}:${account.providerAccountId}`;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid;
      }
      return session;
    },
  },
});
