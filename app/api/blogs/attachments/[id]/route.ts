import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
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

    const res = await fetch(`${BACKEND}/api/blogs/attachments/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        return new NextResponse(text || "Failed to download attachment", {
            status: res.status,
        });
    }

    const headers = new Headers();
    const contentType = res.headers.get("content-type");
    const contentDisposition = res.headers.get("content-disposition");

    if (contentType) headers.set("content-type", contentType);
    if (contentDisposition) headers.set("content-disposition", contentDisposition);

    return new NextResponse(res.body, {
        status: res.status,
        headers,
    });
}