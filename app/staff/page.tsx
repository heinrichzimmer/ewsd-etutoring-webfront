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
        if (typeof value === "number" && Number.isFinite(value)) return value;
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

function formatMetric(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
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
                        fetch("/api/staff/reports/messaging-summary?windowDays=7", {
                            cache: "no-store",
                        }),
                        fetch("/api/staff/reports/students-without-tutor?page=0&size=5", {
                            cache: "no-store",
                        }),
                    ]);

                const adminData = await adminRes.json().catch(() => ({}));
                const tutorsData = await tutorsRes.json().catch(() => ({}));
                const studentsData = await studentsRes.json().catch(() => ({}));
                const messagingData = await messagingRes.json().catch(() => ({}));
                const withoutTutorData = await withoutTutorRes.json().catch(() => ({}));

                if (!adminRes.ok) {
                    throw new Error(adminData?.message ?? "Failed to load admin profile");
                }
                if (!tutorsRes.ok) {
                    throw new Error(tutorsData?.message ?? "Failed to load tutors");
                }
                if (!studentsRes.ok) {
                    throw new Error(studentsData?.message ?? "Failed to load students");
                }
                if (!messagingRes.ok) {
                    throw new Error(messagingData?.message ?? "Failed to load messaging summary");
                }
                if (!withoutTutorRes.ok) {
                    throw new Error(
                        withoutTutorData?.message ?? "Failed to load students without tutor"
                    );
                }

                const tutorList = Array.isArray(tutorsData) ? tutorsData : tutorsData?.content ?? [];
                const studentList = Array.isArray(studentsData)
                    ? studentsData
                    : studentsData?.content ?? [];
                const withoutTutorList = Array.isArray(withoutTutorData)
                    ? withoutTutorData
                    : withoutTutorData?.content ?? [];

                const messagingObj =
                    messagingData && typeof messagingData === "object" ? messagingData : {};

                setAdminUser(adminData);
                setTutors(tutorList);
                setStudents(studentList);
                setStudentsWithoutTutor(withoutTutorList);

                const totalMessages = getNumber(messagingObj, [
                    "messagesLast7Days",
                    "messageCountLast7Days",
                    "totalMessagesLast7Days",
                    "totalMessages",
                    "messageCount",
                    "messagesInWindow",
                    "totalMessagesInWindow",
                ]);

                const averageFromApi = getNumber(messagingObj, [
                    "averageMessagesPerTutor",
                    "avgMessagesPerTutor",
                    "averagePerTutor",
                    "averageMessagesPerTutorLast7Days",
                    "averageMessagesPerTutorInLast7Days",
                    "avgMessagesPerTutorLast7Days",
                    "avgMessagesPerTutorInLast7Days",
                    "averageMessagesPerTutorInWindow",
                ]);

                const fallbackAverage =
                    tutorList.length > 0 ? Number((totalMessages / tutorList.length).toFixed(1)) : 0;

                setMessagesLast7Days(totalMessages);
                setAverageMessagesPerTutor(averageFromApi > 0 ? averageFromApi : fallbackAverage);
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
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Button asChild className="w-full justify-start gap-2 sm:w-auto">
                    <Link href="/staff/tutors">
                        <GraduationCap className="h-4 w-4" />
                        Tutors
                    </Link>
                </Button>

                <Button asChild variant="secondary" className="w-full justify-start gap-2 sm:w-auto">
                    <Link href="/staff/students">
                        <Users className="h-4 w-4" />
                        Students
                    </Link>
                </Button>

                <Button asChild variant="secondary" className="w-full justify-start gap-2 sm:w-auto">
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
                    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                        <CardTitle className="text-sm font-medium leading-5">
                            Messages in Last 7 Days
                        </CardTitle>
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{loading ? "..." : messagesLast7Days}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total messages exchanged in the last 7 days.
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                        <CardTitle className="text-sm font-medium leading-5">
                            Average Messages per Tutor
                        </CardTitle>
                        <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {loading ? "..." : formatMetric(averageMessagesPerTutor)}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Average messaging activity for each tutor.
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                        <CardTitle className="text-sm font-medium leading-5">
                            Students Without Personal Tutor
                        </CardTitle>
                        <UserX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base">Students Without Tutor</CardTitle>
                        <Badge variant="outline" className="w-fit">
                            {studentsWithoutTutorCount}
                        </Badge>
                    </CardHeader>

                    <CardContent>
                        <div className="hidden overflow-auto rounded-lg border bg-white md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                <tr className="border-b">
                                    <th className="w-15 px-3 py-2 text-left">No</th>
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

                        <div className="grid gap-3 md:hidden">
                            {loading ? (
                                <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            ) : studentsWithoutTutor.length === 0 ? (
                                <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                    All visible students already have tutors.
                                </div>
                            ) : (
                                studentsWithoutTutor.map((student, idx) => (
                                    <div key={student.id} className="rounded-xl border bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xs text-muted-foreground">#{idx + 1}</div>
                                                <div className="truncate font-medium">{fullName(student)}</div>
                                                <div className="truncate text-sm text-muted-foreground">
                                                    {student.email ?? "-"}
                                                </div>
                                            </div>

                                            <Badge variant="outline">Unallocated</Badge>
                                        </div>

                                        <div className="mt-3 space-y-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Username: </span>
                                                <span>{student.username ?? "-"}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
                                                <Link href="/staff/allocate">Allocate</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
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
                            <div className="mt-1 text-2xl font-semibold">
                                {loading ? "..." : students.length}
                            </div>
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-4">
                            <div className="text-sm text-muted-foreground">Admin Last Login</div>
                            <div className="mt-1 text-sm font-medium wrap-break-word">
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