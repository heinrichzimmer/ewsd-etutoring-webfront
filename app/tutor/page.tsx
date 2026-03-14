"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Meeting = {
    id: string;
    title?: string;
    studentUserId: string;
    startDate: string;
    endDate: string;
    mode: "VIRTUAL" | "IN_PERSON";
    location?: string | null;
    link?: string | null;
    description?: string | null;
    status?: string;
};

function formatDate(value: string) {
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

export default function TutorDashboardPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        try {
            const res = await fetch("/api/tutor/meetings?page=0&size=20");
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message ?? "Failed to load meetings");
            setMeetings(Array.isArray(data) ? data : data?.content ?? []);
        } catch (e: any) {
            setError(e?.message ?? "Something went wrong");
        }
    }

    useEffect(() => {
        load();
    }, []);

    const now = Date.now();

    const upcoming = useMemo(
        () => meetings.filter((m) => new Date(m.startDate).getTime() >= now),
        [meetings, now]
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold">Tutor Dashboard</h1>
                <Button asChild>
                    <Link href="/tutor/meetings/create">Create Meeting</Link>
                </Button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Total Meetings</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{meetings.length}</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Upcoming Meetings</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{upcoming.length}</CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Recent Meetings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                            <tr className="border-b">
                                <th className="px-3 py-2 text-left">Student ID</th>
                                <th className="px-3 py-2 text-left">Start</th>
                                <th className="px-3 py-2 text-left">Mode</th>
                            </tr>
                            </thead>
                            <tbody>
                            {meetings.slice(0, 5).map((m) => (
                                <tr key={m.id} className="border-b">
                                    <td className="px-3 py-2">{m.studentUserId}</td>
                                    <td className="px-3 py-2">{formatDate(m.startDate)}</td>
                                    <td className="px-3 py-2">{m.mode}</td>
                                </tr>
                            ))}
                            {meetings.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                                        No meetings yet.
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