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

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });

    const url = new URL(req.url);
    const page = url.searchParams.get("page") ?? "0";
    const size = url.searchParams.get("size") ?? "100";

    // 1) Try admin endpoint
    const adminRes = await fetch(`${BACKEND}/api/admin/users/tutors?page=${page}&size=${size}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    const adminData = await safeJson(adminRes);

    if (adminRes.ok) {
        return NextResponse.json(adminData?.content ?? []);
    }

    // 2) Fallback to /api/v1/users
    if (adminRes.status >= 500) {
        const v1Res = await fetch(`${BACKEND}/api/v1/users`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        const v1Data = await safeJson(v1Res);
        if (!v1Res.ok) return NextResponse.json(v1Data, { status: v1Res.status });

        const list = Array.isArray(v1Data) ? v1Data : v1Data?.content ?? [];
        const tutors = list.filter((u: any) => u.role === "TUTOR");
        return NextResponse.json(tutors);
    }

    return NextResponse.json(adminData, { status: adminRes.status });
}