import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

      if (!user.email || !allowedEmails.includes(user.email)) {
        return false
      }

      // Update or create AdminUser
      await prisma.adminUser.upsert({
        where: { email: user.email },
        update: {
          lastLoginAt: new Date(),
          name: user.name || null,
          image: user.image || null
        },
        create: {
          email: user.email,
          name: user.name || null,
          image: user.image || null,
          lastLoginAt: new Date()
        }
      })

      return true
    },
    async session({ session }) {
      if (session.user?.email) {
        const adminUser = await prisma.adminUser.findUnique({
          where: { email: session.user.email }
        })

        if (!adminUser) {
          throw new Error("Unauthorized")
        }
      }

      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
})