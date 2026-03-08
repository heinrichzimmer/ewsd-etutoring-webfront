import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const token = (await cookies()).get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });

    const url = new URL(req.url);
    const page = url.searchParams.get("page") ?? "0";
    const size = url.searchParams.get("size") ?? "100";
    const search = url.searchParams.get("search") ?? "";

    try {
        const res = await fetch(
            `${BACKEND}/api/admin/allocations?page=${page}&size=${size}&search=${encodeURIComponent(search)}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );

        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { message: `Cannot reach backend (${BACKEND}). Is Docker running?` },
            { status: 502 }
        );
    }
}

export async function POST(req: Request) {
    const token = (await cookies()).get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });

    const body = await req.json();

    try {
        const res = await fetch(`${BACKEND}/api/admin/allocations`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { message: `Cannot reach backend (${BACKEND}). Is Docker running?` },
            { status: 502 }
        );
    }
}