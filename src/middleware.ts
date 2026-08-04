import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    if (req.nextauth.token?.mustChangePassword && req.nextUrl.pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protect pages only. API routes protect themselves via
     * requireUser()/requireAdmin() so a fetch() from an expired session
     * gets a clean 401 JSON response instead of a redirect.
     */
    "/((?!login|api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)",
  ],
};
