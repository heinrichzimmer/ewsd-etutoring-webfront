import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();

    const res = await fetch(`${process.env.BACKEND_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return NextResponse.json(
            { message: data?.message ?? "Signup failed", code: data?.code ?? "SIGNUP_FAILED" },
            { status: res.status }
        );
    }

    return NextResponse.json(data);
}