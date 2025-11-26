import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./src/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth).*)"],
};
