"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

const ITEMS_PER_PAGE = 5;

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
    const nested = (obj.student as Record<string, unknown> | undefined) ?? obj;

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
        mode: obj.mode === "IN_PERSON" ? "IN_PERSON" : "VIRTUAL",
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
    const [currentPage, setCurrentPage] = useState(1);

    const loadData = useCallback(async () => {
        try {
            const [meetingsRes, studentsRes] = await Promise.all([
                fetch("/api/tutor/meetings?page=0&size=50", { cache: "no-store" }),
                fetch("/api/tutor/allocated-students", { cache: "no-store" }),
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
        void loadData();
    }, [loadData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [query]);

    const studentById = useMemo(() => {
        const map = new Map<string, Student>();
        students.forEach((s) => map.set(s.id, s));
        return map;
    }, [students]);

    const filtered = useMemo(() => {
        return meetings.filter((m) => {
            const student = studentById.get(m.studentUserId);
            const studentName = student ? fullName(student) : m.studentUserId;

            return `${studentName} ${student?.email ?? ""} ${m.description ?? ""} ${m.mode} ${m.virtualPlatform ?? ""}`
                .toLowerCase()
                .includes(query.toLowerCase());
        });
    }, [meetings, studentById, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedMeetings = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold">Meeting List</h1>

                <Button asChild className="w-full sm:w-auto">
                    <Link href="/tutor/meetings/create">Create Meeting</Link>
                </Button>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">Meetings</CardTitle>

                    <Input
                        className="w-full sm:max-w-xs"
                        placeholder="Search meeting..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="hidden overflow-auto rounded-lg border bg-white md:block">
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
                            ) : paginatedMeetings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                                        No meetings found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedMeetings.map((m) => {
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
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="w-fit">
                                                        {m.mode}
                                                    </Badge>
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
                                                    <Link href={`/tutor/meetings/${m.id}/edit`}>Edit</Link>
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

                    <div className="grid gap-3 md:hidden">
                        {loading ? (
                            <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                Loading meetings...
                            </div>
                        ) : paginatedMeetings.length === 0 ? (
                            <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                No meetings found.
                            </div>
                        ) : (
                            paginatedMeetings.map((m) => {
                                const student = studentById.get(m.studentUserId);

                                return (
                                    <div key={m.id} className="rounded-xl border bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate font-medium">
                                                    {student ? fullName(student) : m.studentUserId}
                                                </div>
                                                <div className="truncate text-sm text-muted-foreground">
                                                    {student?.email ?? "No email"}
                                                </div>
                                            </div>

                                            <Badge variant="outline">{m.mode}</Badge>
                                        </div>

                                        <div className="mt-3 space-y-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Start: </span>
                                                <span>{formatDate(m.startDate)}</span>
                                            </div>

                                            <div>
                                                <span className="text-muted-foreground">End: </span>
                                                <span>{formatDate(m.endDate)}</span>
                                            </div>

                                            <div>
                                                <span className="text-muted-foreground">Description: </span>
                                                <span>{m.description ?? "-"}</span>
                                            </div>

                                            <div>
                                                <span className="text-muted-foreground">Platform: </span>
                                                <span>{m.virtualPlatform ?? m.location ?? "-"}</span>
                                            </div>

                                            <div>
                                                <span className="text-muted-foreground">Link: </span>
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
                                                    <span>-</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                            <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
                                                <Link href={`/tutor/meetings/${m.id}/edit`}>Edit</Link>
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="w-full sm:w-auto"
                                                disabled={deletingId === m.id}
                                                onClick={() => void removeMeeting(m.id)}
                                            >
                                                {deletingId === m.id ? "Deleting..." : "Delete"}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {!loading && filtered.length > 0 && (
                        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="w-full sm:w-auto"
                                >
                                    Previous
                                </Button>

                                <Button
                                    variant="secondary"
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="w-full sm:w-auto"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}