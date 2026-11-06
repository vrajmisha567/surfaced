import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only account-related routes need a fresh session; marketing pages stay fully cached.
export const config = {
  matcher: ["/account/:path*", "/login", "/signup", "/forgot-password", "/auth/:path*"],
};
