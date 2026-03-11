import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function safeJson(res: Response) {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL!;
    const res = await fetch(`${BACKEND}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    const data = await safeJson(res);
    if (!res.ok) return NextResponse.json(data, { status: res.status });

    const list = Array.isArray(data) ? data : data?.content ?? [];
    const tutors = list.filter((u: any) => u.role === "TUTOR");

    return NextResponse.json(tutors);
}