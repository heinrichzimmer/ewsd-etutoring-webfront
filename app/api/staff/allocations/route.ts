import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function safeJson(res: Response) {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL!;
    const url = new URL(req.url);
    const page = url.searchParams.get("page") ?? "0";
    const size = url.searchParams.get("size") ?? "20";
    const search = url.searchParams.get("search") ?? "";

    const res = await fetch(
        `${BACKEND}/api/admin/allocations?page=${page}&size=${size}&search=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL!;
    const body = await req.json();

    const res = await fetch(`${BACKEND}/api/admin/allocations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}