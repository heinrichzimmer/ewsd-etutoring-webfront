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

export async function PATCH(
    _: Request,
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

    const res = await fetch(`${BACKEND}/api/conversations/${id}/read`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    // ✅ 204 No Content must NOT use NextResponse.json(...)
    if (res.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}