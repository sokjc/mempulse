import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuth = !!req.auth
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
  const isApiAdminRoute = req.nextUrl.pathname.startsWith("/api/dashboard") ||
                          req.nextUrl.pathname.startsWith("/api/cron")

  if ((isAdminRoute || isApiAdminRoute) && !isAuth) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/dashboard/:path*',
    '/api/cron/:path*'
  ]
}