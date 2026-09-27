import { NextResponse, type NextRequest } from "next/server";

// The API sets __Host-refreshToken outside development and refreshToken in
// development — accept either (the middleware runs on the web server and does
// not know which mode the API is in). A session cookie may still be dead or
// revoked; the dashboard verifies it for real client-side
// (see app/dashboard/page.tsx).
const SESSION_COOKIES = ["refreshToken", "__Host-refreshToken"];

export function middleware(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIES.some((name) =>
    request.cookies.has(name),
  );

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only /dashboard is gated here. /login and /register stay reachable so a
  // stale cookie can never create a redirect loop with the client-side guard.
  matcher: ["/dashboard/:path*"],
};
