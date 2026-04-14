"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    BarChart3,
    GraduationCap,
    MessageSquare,
    UserRound,
    Users,
    UserX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type User = {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    isLocked?: boolean;
    lastLoginDate?: string | null;
};

function fullName(u?: Partial<User>) {
    if (!u) return "—";
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return name || u.username || u.email || "—";
}

function getNumber(obj: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = obj[key];
        if (typeof value === "number") return value;
    }
    return 0;
}

function formatDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    return value;
}

export default function StaffDashboardPage() {
    const [loading, setLoading] = useState(true);

    const [adminUser, setAdminUser] = useState<User | null>(null);
    const [tutors, setTutors] = useState<User[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [studentsWithoutTutor, setStudentsWithoutTutor] = useState<User[]>([]);

    const [messagesLast7Days, setMessagesLast7Days] = useState(0);
    const [averageMessagesPerTutor, setAverageMessagesPerTutor] = useState(0);

    useEffect(() => {
        async function load() {
            setLoading(true);

            try {
                const [adminRes, tutorsRes, studentsRes, messagingRes, withoutTutorRes] =
                    await Promise.all([
                        fetch("/api/staff/admin-user", { cache: "no-store" }),
                        fetch("/api/staff/tutors", { cache: "no-store" }),
                        fetch("/api/staff/students", { cache: "no-store" }),
                        fetch("/api/staff/reports/messaging-summary?windowDays=7", { cache: "no-store" }),
                        fetch("/api/staff/reports/students-without-tutor?page=0&size=5", { cache: "no-store" }),
                    ]);

                const adminData = await adminRes.json().catch(() => ({}));
                const tutorsData = await tutorsRes.json().catch(() => ({}));
                const studentsData = await studentsRes.json().catch(() => ({}));
                const messagingData = await messagingRes.json().catch(() => ({}));
                const withoutTutorData = await withoutTutorRes.json().catch(() => ({}));

                if (!adminRes.ok) throw new Error(adminData?.message ?? "Failed to load admin profile");
                if (!tutorsRes.ok) throw new Error(tutorsData?.message ?? "Failed to load tutors");
                if (!studentsRes.ok) throw new Error(studentsData?.message ?? "Failed to load students");
                if (!messagingRes.ok) throw new Error(messagingData?.message ?? "Failed to load messaging summary");
                if (!withoutTutorRes.ok) throw new Error(withoutTutorData?.message ?? "Failed to load students without tutor");

                const tutorList = Array.isArray(tutorsData) ? tutorsData : tutorsData?.content ?? [];
                const studentList = Array.isArray(studentsData) ? studentsData : studentsData?.content ?? [];
                const withoutTutorList = Array.isArray(withoutTutorData)
                    ? withoutTutorData
                    : withoutTutorData?.content ?? [];

                const messagingObj =
                    messagingData && typeof messagingData === "object" ? messagingData : {};

                setAdminUser(adminData);
                setTutors(tutorList);
                setStudents(studentList);
                setStudentsWithoutTutor(withoutTutorList);

                setMessagesLast7Days(
                    getNumber(messagingObj, [
                        "messagesLast7Days",
                        "messageCountLast7Days",
                        "totalMessagesLast7Days",
                        "totalMessages",
                        "messageCount",
                        "messagesInWindow",
                        "totalMessagesInWindow",
                    ])
                );

                setAverageMessagesPerTutor(
                    getNumber(messagingObj, [
                        "averageMessagesPerTutor",
                        "avgMessagesPerTutor",
                        "averagePerTutor",
                    ])
                );
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
            } finally {
                setLoading(false);
            }
        }

        void load();
    }, []);

    const studentsWithoutTutorCount = useMemo(() => {
        return studentsWithoutTutor.length;
    }, [studentsWithoutTutor]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Button asChild className="gap-2">
                    <Link href="/staff/tutors">
                        <GraduationCap className="h-4 w-4" />
                        Tutors
                    </Link>
                </Button>

                <Button asChild variant="secondary" className="gap-2">
                    <Link href="/staff/students">
                        <Users className="h-4 w-4" />
                        Students
                    </Link>
                </Button>

                <Button asChild variant="secondary" className="gap-2">
                    <Link href="/staff/allocate">
                        <UserRound className="h-4 w-4" />
                        Allocate / Reallocate
                    </Link>
                </Button>
            </div>

            <div>
                <h1 className="text-2xl font-semibold">
                    {loading ? "Admin Dashboard" : `Welcome, ${fullName(adminUser ?? undefined)}`}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Overview of messaging activity, tutor performance, and student allocation status.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Messages in Last 7 Days</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{loading ? "..." : messagesLast7Days}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total messages exchanged in the last 7 days.
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Average Messages per Tutor</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{loading ? "..." : averageMessagesPerTutor}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Average messaging activity for each tutor.
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Students Without Personal Tutor</CardTitle>
                        <UserX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{loading ? "..." : studentsWithoutTutorCount}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Students who still need tutor allocation.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Students Without Tutor</CardTitle>
                        <Badge variant="outline">{studentsWithoutTutorCount}</Badge>
                    </CardHeader>

                    <CardContent>
                        <div className="rounded-lg border bg-white overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                <tr className="border-b">
                                    <th className="px-3 py-2 text-left w-15">No</th>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Username</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2 text-right">Action</th>
                                </tr>
                                </thead>

                                <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : studentsWithoutTutor.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                                            All visible students already have tutors.
                                        </td>
                                    </tr>
                                ) : (
                                    studentsWithoutTutor.map((student, idx) => (
                                        <tr key={student.id} className="border-b">
                                            <td className="px-3 py-2">{idx + 1}</td>
                                            <td className="px-3 py-2 font-medium">{fullName(student)}</td>
                                            <td className="px-3 py-2">{student.username ?? "-"}</td>
                                            <td className="px-3 py-2">{student.email ?? "-"}</td>
                                            <td className="px-3 py-2 text-right">
                                                <Button asChild size="sm" variant="secondary">
                                                    <Link href="/staff/allocate">Allocate</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Quick Overview</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        <div className="rounded-lg border bg-slate-50 p-4">
                            <div className="text-sm text-muted-foreground">Tutors</div>
                            <div className="mt-1 text-2xl font-semibold">{loading ? "..." : tutors.length}</div>
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-4">
                            <div className="text-sm text-muted-foreground">Students</div>
                            <div className="mt-1 text-2xl font-semibold">{loading ? "..." : students.length}</div>
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-4">
                            <div className="text-sm text-muted-foreground">Admin Last Login</div>
                            <div className="mt-1 text-sm font-medium">
                                {loading ? "..." : formatDate(adminUser?.lastLoginDate)}
                            </div>
                        </div>

                        <Button asChild className="w-full">
                            <Link href="/staff/allocate">Go to Allocation</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}