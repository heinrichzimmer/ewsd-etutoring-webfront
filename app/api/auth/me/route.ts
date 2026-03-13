import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const token = (await cookies()).get("access_token")?.value;
    if (!token) {
        return NextResponse.json({ message: "Unauthenticated", code: "NO_TOKEN" }, { status: 401 });
    }

    const res = await fetch(`${process.env.BACKEND_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return NextResponse.json(
            { message: data?.message ?? "Unauthorized", code: data?.code ?? "UNAUTHORIZED" },
            { status: res.status }
        );
    }

    return NextResponse.json(data);
}