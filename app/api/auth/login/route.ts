import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();

    const res = await fetch(`${process.env.BACKEND_URL}/api/auth/login`, {
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

    // backend returns accessToken (AuthResponse)
    const out = NextResponse.json(data);

    out.cookies.set("sessionRole", data.role === "ADMIN" ? "staff" : "user", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });

    out.cookies.set("access_token", data.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });

    return out;
}