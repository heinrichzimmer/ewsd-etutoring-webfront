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

type Student = {
    id: string;
    role: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive?: boolean;
    isLocked?: boolean;
    createdDate?: string | null;
    updatedDate?: string | null;
    lastLoginDate?: string | null;
};

type AllocationSlot = {
    scheduleStart: string;
    scheduleEnd: string;
};

type AllocatedStudent = {
    student: Student;
    allocationSlots: AllocationSlot[];
};

function normalizeAllocatedStudent(raw: any): AllocatedStudent | null {
    if (!raw || typeof raw !== "object") return null;
    if (!raw.student || typeof raw.student !== "object") return null;

    const student = raw.student;
    const slots = Array.isArray(raw.allocationSlots) ? raw.allocationSlots : [];

    if (typeof student.id !== "string") return null;

    return {
        student: {
            id: student.id,
            role: student.role ?? "STUDENT",
            username: student.username ?? "",
            firstName: student.firstName ?? "",
            lastName: student.lastName ?? "",
            email: student.email ?? "",
            isActive: student.isActive,
            isLocked: student.isLocked,
            createdDate: student.createdDate ?? null,
            updatedDate: student.updatedDate ?? null,
            lastLoginDate: student.lastLoginDate ?? null,
        },
        allocationSlots: slots
            .filter((slot: any) => slot && typeof slot === "object")
            .map((slot: any) => ({
                scheduleStart: slot.scheduleStart ?? "",
                scheduleEnd: slot.scheduleEnd ?? "",
            }))
            .filter((slot: AllocationSlot) => slot.scheduleStart && slot.scheduleEnd),
    };
}

export async function GET() {
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

        const list = Array.isArray(data) ? data : [];
        const normalized = list
            .map(normalizeAllocatedStudent)
            .filter((item): item is AllocatedStudent => item !== null);

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