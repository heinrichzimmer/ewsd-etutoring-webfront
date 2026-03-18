import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const token = req.cookies.get("access_token")?.value;
    const role = req.cookies.get("sessionRole")?.value;

    if (pathname.startsWith("/staff")) {
        if (!token || role !== "staff") {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    if (pathname.startsWith("/tutor")) {
        if (!token || role !== "tutor") {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    if (pathname.startsWith("/student")) {
        if (!token || role !== "student") {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/staff/:path*", "/tutor/:path*", "/student/:path*"],
};