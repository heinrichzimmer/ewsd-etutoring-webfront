import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function safeJson(res: Response) {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL!;

    const res = await fetch(`${BACKEND}/api/admin/allocations/${params.id}/undo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}