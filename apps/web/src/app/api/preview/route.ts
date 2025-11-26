import { NextRequest, NextResponse } from "next/server";
import { draftMode } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const block = searchParams.get("block");

  if (!token) {
    return NextResponse.json(
      { error: "Missing preview token" },
      { status: 401 }
    );
  }

  try {
    const decoded = JSON.parse(globalThis.atob(token));

    if (!decoded.key || !decoded.exp) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 401 }
      );
    }

    if (Date.now() > decoded.exp) {
      return NextResponse.json(
        { error: "Preview token expired" },
        { status: 401 }
      );
    }

    if (block && decoded.key !== block) {
      return NextResponse.json(
        { error: "Token does not match requested block" },
        { status: 403 }
      );
    }

    (await draftMode()).enable();

    const redirectUrl = block ? `/?preview=${block}` : "/";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch {
    return NextResponse.json(
      { error: "Invalid preview token" },
      { status: 401 }
    );
  }
}

export async function POST() {
  try {
    (await draftMode()).disable();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disable preview mode" },
      { status: 500 }
    );
  }
}
