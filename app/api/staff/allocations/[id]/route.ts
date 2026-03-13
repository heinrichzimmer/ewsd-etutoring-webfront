import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function safeJson(res: Response) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) {
        return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    try {
        const res = await fetch(`${BACKEND}/api/admin/allocations/${id}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await safeJson(res);
        return NextResponse.json(data, { status: res.status });
    } catch (e: any) {
        return NextResponse.json(
            {
                message: "Failed to update allocation",
                error: String(e?.message ?? e),
            },
            { status: 500 }
        );
    }
}