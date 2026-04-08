"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Meeting = {
    id: string;
    studentUserId: string;
    startDate: string;
    endDate: string;
    mode: "VIRTUAL" | "IN_PERSON";
    location?: string | null;
    link?: string | null;
    description?: string | null;
    virtualPlatform?: string | null;
    status?: string;
};

type Student = {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
};

type AllocatedStudentItem = {
    student: Student;
    allocationSlots?: Array<{
        scheduleStart: string;
        scheduleEnd: string;
    }>;
};

function fullName(u: Student) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;
}

function formatDate(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;

    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function normalizeStudent(raw: unknown): Student | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    const nested =
        (obj.student as Record<string, unknown> | undefined) ??
        obj;

    if (typeof nested.id !== "string") return null;

    return {
        id: nested.id,
        username: typeof nested.username === "string" ? nested.username : "",
        firstName: typeof nested.firstName === "string" ? nested.firstName : "",
        lastName: typeof nested.lastName === "string" ? nested.lastName : "",
        email: typeof nested.email === "string" ? nested.email : "",
    };
}

function normalizeMeeting(raw: unknown): Meeting | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    const studentUserId =
        typeof obj.studentUserId === "string"
            ? obj.studentUserId
            : typeof obj.studentId === "string"
                ? obj.studentId
                : "";

    if (!studentUserId) return null;

    return {
        id: obj.id,
        studentUserId,
        startDate:
            typeof obj.startDate === "string"
                ? obj.startDate
                : typeof obj.startTime === "string"
                    ? obj.startTime
                    : "",
        endDate:
            typeof obj.endDate === "string"
                ? obj.endDate
                : typeof obj.endTime === "string"
                    ? obj.endTime
                    : "",
        mode:
            obj.mode === "IN_PERSON" ? "IN_PERSON" : "VIRTUAL",
        location: typeof obj.location === "string" ? obj.location : null,
        link: typeof obj.link === "string" ? obj.link : null,
        description: typeof obj.description === "string" ? obj.description : null,
        virtualPlatform:
            typeof obj.virtualPlatform === "string" ? obj.virtualPlatform : null,
        status: typeof obj.status === "string" ? obj.status : undefined,
    };
}

export default function TutorMeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [meetingsRes, studentsRes] = await Promise.all([
                fetch("/api/tutor/meetings?page=0&size=50", {
                    cache: "no-store",
                }),
                fetch("/api/tutor/allocated-students", {
                    cache: "no-store",
                }),
            ]);

            const meetingsData = await meetingsRes.json().catch(() => ({}));
            const studentsData = await studentsRes.json().catch(() => ({}));

            if (!meetingsRes.ok) {
                throw new Error(meetingsData?.message ?? "Failed to load meetings");
            }

            if (!studentsRes.ok) {
                throw new Error(studentsData?.message ?? "Failed to load allocated students");
            }

            const rawMeetings: unknown[] = Array.isArray(meetingsData)
                ? meetingsData
                : meetingsData?.content ?? [];

            const rawStudents: unknown[] = Array.isArray(studentsData)
                ? studentsData
                : studentsData?.content ?? [];

            setMeetings(
                rawMeetings
                    .map(normalizeMeeting)
                    .filter((x): x is Meeting => x !== null)
            );

            setStudents(
                rawStudents
                    .map(normalizeStudent)
                    .filter((x): x is Student => x !== null)
            );
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Something went wrong while loading data"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    async function refreshData() {
        setLoading(true);
        await loadData();
    }

    async function removeMeeting(id: string) {
        try {
            setDeletingId(id);

            const res = await fetch(`/api/tutor/meetings/${id}`, {
                method: "DELETE",
            });

            if (res.status === 204) {
                toast.success("Meeting deleted.");
                await refreshData();
                return;
            }

            const data = await res.json().catch(() => ({}));
            toast.error(data?.message ?? "Failed to delete meeting");
        } catch {
            toast.error("Failed to delete meeting");
        } finally {
            setDeletingId(null);
        }
    }

    useEffect(() => {
        Promise.resolve().then(() => {
            void loadData();
        });
    }, [loadData]);

    const studentById = useMemo(() => {
        const map = new Map<string, Student>();
        students.forEach((s) => map.set(s.id, s));
        return map;
    }, [students]);

    const filtered = meetings.filter((m) => {
        const student = studentById.get(m.studentUserId);
        const studentName = student ? fullName(student) : m.studentUserId;

        return `${studentName} ${student?.email ?? ""} ${m.description ?? ""} ${m.mode} ${m.virtualPlatform ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase());
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Meeting List</h1>

                <Button asChild>
                    <Link href="/tutor/meetings/create">Create Meeting</Link>
                </Button>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-base">Meetings</CardTitle>

                    <Input
                        className="max-w-xs"
                        placeholder="Search something"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </CardHeader>

                <CardContent>
                    <div className="overflow-auto rounded-lg border bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                            <tr className="border-b">
                                <th className="px-3 py-3 text-left">Date & Time</th>
                                <th className="px-3 py-3 text-left">Student</th>
                                <th className="px-3 py-3 text-left">Mode</th>
                                <th className="px-3 py-3 text-left">Description</th>
                                <th className="px-3 py-3 text-left">Link</th>
                                <th className="px-3 py-3 text-right">Actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                                        Loading meetings...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                                        No meetings found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((m) => {
                                    const student = studentById.get(m.studentUserId);

                                    return (
                                        <tr key={m.id} className="border-b">
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col">
                                                    <span>{formatDate(m.startDate)}</span>
                                                    <span className="text-xs text-muted-foreground">
                              to {formatDate(m.endDate)}
                            </span>
                                                </div>
                                            </td>

                                            <td className="px-3 py-3">
                                                <div className="flex flex-col">
                            <span className="font-medium">
                              {student ? fullName(student) : m.studentUserId}
                            </span>
                                                    {student?.email && (
                                                        <span className="text-xs text-muted-foreground">
                                {student.email}
                              </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-3 py-3">
                                                <div className="flex flex-col">
                                                    <span>{m.mode}</span>
                                                    {m.virtualPlatform ? (
                                                        <span className="text-xs text-muted-foreground">
                                {m.virtualPlatform}
                              </span>
                                                    ) : null}
                                                </div>
                                            </td>

                                            <td className="px-3 py-3">{m.description ?? "-"}</td>

                                            <td className="px-3 py-3">
                                                {m.link ? (
                                                    <a
                                                        href={m.link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-600 underline"
                                                    >
                                                        Join
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>

                                            <td className="space-x-2 px-3 py-3 text-right">
                                                <Button asChild size="sm" variant="secondary">
                                                    <Link href={`/tutor/meetings/${m.id}/edit`}>
                                                        Edit
                                                    </Link>
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={deletingId === m.id}
                                                    onClick={() => void removeMeeting(m.id)}
                                                >
                                                    {deletingId === m.id ? "Deleting..." : "Delete"}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}