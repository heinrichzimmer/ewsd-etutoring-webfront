import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) {
        return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });
    }

    const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), // { username, password }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return NextResponse.json(
            { message: data?.message ?? "Login failed", code: data?.code ?? "LOGIN_FAILED" },
            { status: res.status }
        );
    }

    const out = NextResponse.json(data);

    // ✅ store jwt for API proxy routes
    out.cookies.set("access_token", data.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });

    // ✅ make your existing middleware work (staff dashboard access)
    out.cookies.set("sessionRole", data.role === "ADMIN" ? "staff" : "user", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });

    return out;
}