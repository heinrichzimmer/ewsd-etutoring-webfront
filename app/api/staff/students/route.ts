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

    try {
        const res = await fetch(`${BACKEND}/api/admin/users/students?page=${page}&size=${size}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) return NextResponse.json(data, { status: res.status });

        return NextResponse.json(data.content ?? []);
    } catch (e: any) {
        return NextResponse.json(
            { message: `Cannot reach backend (${BACKEND}). Is Docker running?` },
            { status: 502 }
        );
    }
}