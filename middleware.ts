import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
      });
      request.cookies.delete(cookie.name);
    }
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Server actions already authenticate inside the action. Skipping Auth here
  // avoids a second round trip to Supabase on every Save / form post.
  if (request.headers.has("next-action")) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Stale/revoked refresh tokens leave cookies that fail on every page load.
  // Wipe them so the user can sign in cleanly without console spam.
  if (
    error &&
    (error.code === "refresh_token_not_found" ||
      error.code === "invalid_refresh_token" ||
      /refresh token/i.test(error.message))
  ) {
    clearSupabaseCookies(request, response);
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }

  const role = user?.user_metadata?.role as string | undefined;
  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (isAuthPage && user && !error) {
    const url = request.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/student";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin")) {
    if (!user || error || role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = user && !error ? "/student" : "/login";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/student")) {
    if (!user || error) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (role === "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/login", "/signup"],
};
