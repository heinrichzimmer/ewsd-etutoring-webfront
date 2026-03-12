import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Only protect staff dashboard routes
    if (pathname.startsWith("/staff")) {
        const role = req.cookies.get("sessionRole")?.value;
        const token = req.cookies.get("access_token")?.value;

        // Require login + staff role
        if (!token || role !== "staff") {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/staff/:path*"],
};