import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/entrar", "/convite", "/offline"];

// Renova a sessão do Supabase e faz a checagem otimista de login.
// A autorização real acontece na RLS e em requireViewer().
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  if (!data?.claims && !PUBLIC.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // fora: estáticos, PWA, cron (tem segredo próprio)
  matcher: [
    "/((?!_next/static|_next/image|api/cron|sw.js|manifest.webmanifest|icons/|icon|apple-icon|favicon).*)",
  ],
};
