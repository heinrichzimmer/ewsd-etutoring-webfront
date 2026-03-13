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
    if (!BACKEND) {
        return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });
    }

    const url = new URL(req.url);
    const page = url.searchParams.get("page") ?? "0";
    const size = url.searchParams.get("size") ?? "20";
    const search = url.searchParams.get("search") ?? "";

    try {
        const res = await fetch(
            `${BACKEND}/api/admin/allocations?page=${page}&size=${size}&search=${encodeURIComponent(search)}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            }
        );

        const data = await safeJson(res);

        // If backend errors, return structured debug data
        if (!res.ok) {
            return NextResponse.json(
                {
                    message: data?.message ?? "Backend error",
                    code: data?.code ?? "BACKEND_ERROR",
                    endpoint: "/api/admin/allocations",
                    backendStatus: res.status,
                    backendBody: data,
                },
                { status: res.status }
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            {
                message: "Cannot reach backend",
                endpoint: "/api/admin/allocations",
                BACKEND_URL: BACKEND,
                error: String(e?.message ?? e),
            },
            { status: 502 }
        );
    }
}

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) {
        return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));

    try {
        const res = await fetch(`${BACKEND}/api/admin/allocations`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await safeJson(res);

        if (!res.ok) {
            return NextResponse.json(
                {
                    message: data?.message ?? "Backend error",
                    code: data?.code ?? "BACKEND_ERROR",
                    endpoint: "/api/admin/allocations",
                    backendStatus: res.status,
                    backendBody: data,
                    sentBody: body,
                },
                { status: res.status }
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch (e: any) {
        return NextResponse.json(
            {
                message: "Cannot reach backend",
                endpoint: "/api/admin/allocations",
                BACKEND_URL: BACKEND,
                error: String(e?.message ?? e),
                sentBody: body,
            },
            { status: 502 }
        );
    }
}