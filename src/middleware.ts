import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

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
