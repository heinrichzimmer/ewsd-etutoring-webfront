import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Student = {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
    isActive?: boolean;
    isLocked?: boolean;
    lastLoginDate?: string | null;
};

function toStudent(raw: unknown): Student | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;

    // Case 1: already a student/user object
    if (
        typeof obj.id === "string" &&
        (typeof obj.username === "string" || typeof obj.email === "string")
    ) {
        return {
            id: obj.id,
            username: typeof obj.username === "string" ? obj.username : "",
            firstName: typeof obj.firstName === "string" ? obj.firstName : "",
            lastName: typeof obj.lastName === "string" ? obj.lastName : "",
            email: typeof obj.email === "string" ? obj.email : "",
            role: typeof obj.role === "string" ? obj.role : undefined,
            isActive: typeof obj.isActive === "boolean" ? obj.isActive : undefined,
            isLocked: typeof obj.isLocked === "boolean" ? obj.isLocked : undefined,
            lastLoginDate:
                typeof obj.lastLoginDate === "string" ? obj.lastLoginDate : null,
        };
    }

    // Case 2: nested objects
    if (obj.student) return toStudent(obj.student);
    if (obj.user) return toStudent(obj.user);
    if (obj.studentUser) return toStudent(obj.studentUser);
    if (obj.studentUserDto) return toStudent(obj.studentUserDto);

    return null;
}

function isStudent(value: Student | null): value is Student {
    return value !== null;
}

async function safeJson(res: Response) {
    const text = await res.text();
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return { raw: text };
    }
}

export async function GET(): Promise<NextResponse> {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const BACKEND = process.env.BACKEND_URL;
    if (!BACKEND) {
        return NextResponse.json({ message: "BACKEND_URL is not set" }, { status: 500 });
    }

    try {
        const res = await fetch(`${BACKEND}/api/tutor/allocated-students`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        const data = await safeJson(res);

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        const rawList: unknown[] = Array.isArray(data)
            ? data
            : data &&
            typeof data === "object" &&
            "content" in data &&
            Array.isArray((data as { content?: unknown[] }).content)
                ? (data as { content: unknown[] }).content
                : data &&
                typeof data === "object" &&
                "items" in data &&
                Array.isArray((data as { items?: unknown[] }).items)
                    ? (data as { items: unknown[] }).items
                    : [];

        const normalized: Student[] = rawList
            .map(toStudent)
            .filter(isStudent)
            .filter((student, index, arr) => arr.findIndex((x) => x.id === student.id) === index);

        return NextResponse.json(normalized);
    } catch (e: unknown) {
        return NextResponse.json(
            {
                message: "Failed to load allocated students",
                error: e instanceof Error ? e.message : String(e),
            },
            { status: 500 }
        );
    }
}