import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: { id: string } }) {
    const token = (await cookies()).get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const { id } = params;

    const res = await fetch(`${process.env.BACKEND_URL}/api/admin/allocations/${id}/undo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}