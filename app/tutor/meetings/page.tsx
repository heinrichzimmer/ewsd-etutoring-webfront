"use client";

import { useEffect, useMemo, useState } from "react";
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
    status?: string;
};

type Student = {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
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

export default function TutorMeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [query, setQuery] = useState("");

    async function load() {
        const [meetingsRes, studentsRes] = await Promise.all([
            fetch("/api/tutor/meetings?page=0&size=20"),
            fetch("/api/tutor/allocated-students"),
        ]);

        const meetingsData = await meetingsRes.json().catch(() => ({}));
        const studentsData = await studentsRes.json().catch(() => ({}));

        if (!meetingsRes.ok) {
            toast.error(meetingsData?.message ?? "Failed to load meetings");
            return;
        }

        if (!studentsRes.ok) {
            toast.error(studentsData?.message ?? "Failed to load allocated students");
            return;
        }

        setMeetings(Array.isArray(meetingsData) ? meetingsData : meetingsData?.content ?? []);
        setStudents(Array.isArray(studentsData) ? studentsData : studentsData?.content ?? []);
    }

    async function removeMeeting(id: string) {
        const res = await fetch(`/api/tutor/meetings/${id}`, { method: "DELETE" });

        if (res.status === 204) {
            toast.success("Meeting deleted.");
            load();
            return;
        }

        const data = await res.json().catch(() => ({}));
        toast.error(data?.message ?? "Failed to delete meeting");
    }

    useEffect(() => {
        load();
    }, []);

    const studentById = useMemo(() => {
        const map = new Map<string, Student>();
        students.forEach((s) => map.set(s.id, s));
        return map;
    }, [students]);

    const filtered = meetings.filter((m) => {
        const student = studentById.get(m.studentUserId);
        const studentName = student ? fullName(student) : m.studentUserId;

        return `${studentName} ${student?.email ?? ""} ${m.description ?? ""} ${m.mode}`
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
                            {filtered.map((m) => {
                                const student = studentById.get(m.studentUserId);

                                return (
                                    <tr key={m.id} className="border-b">
                                        <td className="px-3 py-3">{formatDate(m.startDate)}</td>

                                        <td className="px-3 py-3">
                                            <div className="flex flex-col">
                          <span className="font-medium">
                            {student ? fullName(student) : m.studentUserId}
                          </span>
                                                {student?.email && (
                                                    <span className="text-xs text-muted-foreground">{student.email}</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-3 py-3">{m.mode}</td>
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
                                                <Link href={`/tutor/meetings/create?id=${m.id}`}>Edit</Link>
                                            </Button>

                                            <Button size="sm" variant="destructive" onClick={() => removeMeeting(m.id)}>
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                                        No meetings found.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}