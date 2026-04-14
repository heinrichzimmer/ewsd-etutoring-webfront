"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    virtualPlatform?: string | null;
};

const ITEMS_PER_PAGE = 5;

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
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    async function load() {
        setLoading(true);

        const res = await fetch("/api/student/meetings?page=0&size=20");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load meetings");
            setLoading(false);
            return;
        }

        setMeetings(Array.isArray(data) ? data : data?.content ?? []);
        setLoading(false);
    }

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [query]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return meetings;

        return meetings.filter((m) =>
            `${m.description ?? ""} ${m.mode ?? ""} ${m.location ?? ""} ${m.virtualPlatform ?? ""}`
                .toLowerCase()
                .includes(q)
        );
    }, [meetings, query]);

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
                <h1 className="text-2xl font-semibold">Meeting Schedule</h1>

                <Input
                    className="w-full sm:max-w-xs"
                    placeholder="Search meeting..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">My Meetings</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="hidden overflow-auto rounded-lg border bg-white md:block">
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
                                paginatedMeetings.map((m) => (
                                    <tr key={m.id} className="border-b">
                                        <td className="px-3 py-3">{formatDate(m.startDate)}</td>
                                        <td className="px-3 py-3">{formatDate(m.endDate)}</td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline" className="w-fit">
                                                    {m.mode ?? "-"}
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
                                        <td className="px-3 py-3 text-right">
                                            <Button asChild size="sm" variant="secondary">
                                                <Link href={`/student/meetings/${m.id}`}>View</Link>
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
                                Loading meetings...
                            </div>
                        ) : paginatedMeetings.length === 0 ? (
                            <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                No meetings found.
                            </div>
                        ) : (
                            paginatedMeetings.map((m) => (
                                <div key={m.id} className="rounded-xl border bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-medium">{m.description ?? "Meeting"}</div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {formatDate(m.startDate)}
                                            </div>
                                        </div>

                                        <Badge variant="outline">{m.mode ?? "-"}</Badge>
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
                                            <span className="text-muted-foreground">Platform / Location: </span>
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

                                    <div className="mt-4">
                                        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
                                            <Link href={`/student/meetings/${m.id}`}>View</Link>
                                        </Button>
                                    </div>
                                </div>
                            ))
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