import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) {
        return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });
    }

    const res = await fetch(`${BACKEND}/api/assignments/attachments/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const text = await res.text();
        return new NextResponse(text || "Download failed", { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
            "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
            "Content-Disposition":
                res.headers.get("content-disposition") ?? `attachment; filename="assignment-file"`,
        },
    });
}