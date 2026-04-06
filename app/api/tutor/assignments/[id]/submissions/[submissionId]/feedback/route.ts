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
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    const { id, submissionId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) {
        return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));

    const res = await fetch(
        `${BACKEND}/api/tutor/assignments/${id}/submissions/${submissionId}/feedback`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        }
    );

    if (res.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}