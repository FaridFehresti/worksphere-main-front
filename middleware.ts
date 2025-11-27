// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("authToken")?.value;

  const isAuthRoute =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register");

  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/backgrounds") || // 👈 allow your background images
    pathname.startsWith("/assets") || // if you ever use /assets
    pathname.startsWith("/images"); // optional, future-proof

  // Always allow static assets
  if (isPublicAsset) {
    return NextResponse.next();
  }

  // If logged in and trying to hit auth pages → go home
  if (isAuthRoute && token) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  // If unauthenticated and on auth routes → allow
  if (isAuthRoute && !token) {
    return NextResponse.next();
  }

  // For all other routes, require auth
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Only run middleware on "app" routes, skip statics and images etc.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|backgrounds).*)",
  ],
};
