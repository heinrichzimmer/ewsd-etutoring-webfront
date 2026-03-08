import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Protect staff area
    if (pathname.startsWith("/staff") || pathname.startsWith("/allocations")) {
        const role = req.cookies.get("sessionRole")?.value;
        if (role !== "staff") {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/staff/:path*", "/allocations/:path*"],
};