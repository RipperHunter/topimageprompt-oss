import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && (account.provider === 'google' || account.provider === 'discord')) {
        if (!user.email) return false;
        if (profile && (profile.email_verified === false || profile.verified === false)) return false;
        const normalizedEmail = user.email.trim().toLowerCase();
        let dbUser = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: user.name || normalizedEmail.split("@")[0],
              avatar: user.image || "",
              role: 'USER'
            }
          });
        }
        user.id = dbUser.id;
        user.role = dbUser.role;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { name: true, role: true, avatar: true, emailNotifications: true, publicProfile: true }
        });
        if (dbUser) {
          session.user.name = dbUser.name;
          session.user.role = dbUser.role;
          session.user.avatar = dbUser.avatar;
          session.user.emailNotifications = dbUser.emailNotifications;
          session.user.publicProfile = dbUser.publicProfile;
        }
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
