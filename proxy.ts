import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/campaigns",
  "/contacts",
  "/templates",
  "/chats",
  "/analytics",
  "/settings",
];

export const proxy = clerkMiddleware(async (auth, request) => {
  const { userId, redirectToSignIn } = await auth();
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  if (isProtected && !userId) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|api/webhooks|__clerk).*)",
    "/__clerk/:path*",
  ],
};
