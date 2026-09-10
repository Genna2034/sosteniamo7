import { supabasePublicEnv } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/health", "/api/ready"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabasePublicEnv();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
  if (!url || !anonKey) {
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/login?err=config", request.url));
  }
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getUser() valida il token contro Supabase Auth; getSession() non basta come fonte autorizzativa.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isPublic) {
    const redirectUrl = new URL("/login", request.url);
    if (path !== "/") redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }
  if (user && path === "/login") return NextResponse.redirect(new URL("/dashboard", request.url));
  return response;
}
