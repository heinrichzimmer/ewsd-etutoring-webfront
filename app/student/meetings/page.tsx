"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Meeting = {
    id: string;
    studentUserId?: string;
    tutorUserId?: string;
    startDate?: string;
    endDate?: string;
    mode?: "VIRTUAL" | "IN_PERSON";
    location?: string | null;
    link?: string | null;
    description?: string | null;
    status?: string | null;
};

function formatDate(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function StudentMeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [query, setQuery] = useState("");

    async function load() {
        const res = await fetch("/api/student/meetings?page=0&size=20");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load meetings");
            return;
        }

        setMeetings(Array.isArray(data) ? data : data?.content ?? []);
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return meetings;

        return meetings.filter((m) =>
            `${m.description ?? ""} ${m.mode ?? ""} ${m.location ?? ""}`.toLowerCase().includes(q)
        );
    }, [meetings, query]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Meeting Schedule</h1>

                <Input
                    className="max-w-xs"
                    placeholder="Search meeting..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">My Meetings</CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="overflow-auto rounded-lg border bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                            <tr className="border-b">
                                <th className="px-3 py-3 text-left">Start</th>
                                <th className="px-3 py-3 text-left">End</th>
                                <th className="px-3 py-3 text-left">Mode</th>
                                <th className="px-3 py-3 text-left">Description</th>
                                <th className="px-3 py-3 text-left">Link</th>
                                <th className="px-3 py-3 text-right">Action</th>
                            </tr>
                            </thead>

                            <tbody>
                            {filtered.map((m) => (
                                <tr key={m.id} className="border-b">
                                    <td className="px-3 py-3">{formatDate(m.startDate)}</td>
                                    <td className="px-3 py-3">{formatDate(m.endDate)}</td>
                                    <td className="px-3 py-3">{m.mode ?? "-"}</td>
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
                                    <td className="px-3 py-3 text-right">
                                        <Button asChild size="sm" variant="secondary">
                                            <Link href={`/student/meetings/${m.id}`}>View</Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}

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