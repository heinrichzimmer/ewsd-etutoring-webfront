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

export async function GET(
    _: Request,
    context: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });

    const { id } = await context.params;

    const res = await fetch(`${BACKEND}/api/tutor/meetings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const res = await fetch(`${BACKEND}/api/tutor/meetings/${id}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
    _: Request,
    context: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });

    const { id } = await context.params;

    const res = await fetch(`${BACKEND}/api/tutor/meetings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}