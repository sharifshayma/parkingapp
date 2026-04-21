import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/api/dev-login"];

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths pass through untouched (with a session refresh).
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { user, supabaseResponse, supabase } = await updateSession(request);

  // Not authenticated → login
  if (!user) {
    return redirectTo(request, "/login");
  }

  // Profile completion gate
  if (!pathname.startsWith("/complete-profile")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_profile_complete, status, is_admin")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_profile_complete) {
      return redirectTo(request, "/complete-profile");
    }

    // Approval gate
    if (profile.status === "banned") {
      if (!pathname.startsWith("/banned")) {
        return redirectTo(request, "/banned");
      }
    } else if (profile.status === "pending") {
      if (!pathname.startsWith("/pending-approval")) {
        return redirectTo(request, "/pending-approval");
      }
    } else {
      // approved
      if (pathname.startsWith("/pending-approval") || pathname.startsWith("/banned")) {
        return redirectTo(request, "/home");
      }
      // Admin-only routes
      if (pathname.startsWith("/admin") && !profile.is_admin) {
        return redirectTo(request, "/home");
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
