"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Meeting = {
    id: string;
    studentUserId?: string;
    tutorUserId?: string;
    startDate?: string | null;
    endDate?: string | null;
    mode?: "VIRTUAL" | "IN_PERSON";
    location?: string | null;
    link?: string | null;
    description?: string | null;
    status?: string | null;
    virtualPlatform?: string | null;
    createdDate?: string | null;
    updatedDate?: string | null;
};

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

function normalizeMeeting(raw: unknown): Meeting | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    return {
        id: obj.id,
        studentUserId: typeof obj.studentUserId === "string" ? obj.studentUserId : undefined,
        tutorUserId: typeof obj.tutorUserId === "string" ? obj.tutorUserId : undefined,
        startDate:
            typeof obj.startDate === "string"
                ? obj.startDate
                : typeof obj.startTime === "string"
                    ? obj.startTime
                    : null,
        endDate:
            typeof obj.endDate === "string"
                ? obj.endDate
                : typeof obj.endTime === "string"
                    ? obj.endTime
                    : null,
        mode:
            obj.mode === "IN_PERSON"
                ? "IN_PERSON"
                : obj.mode === "VIRTUAL"
                    ? "VIRTUAL"
                    : undefined,
        location: typeof obj.location === "string" ? obj.location : null,
        link: typeof obj.link === "string" ? obj.link : null,
        description: typeof obj.description === "string" ? obj.description : null,
        status: typeof obj.status === "string" ? obj.status : null,
        virtualPlatform:
            typeof obj.virtualPlatform === "string" ? obj.virtualPlatform : null,
        createdDate: typeof obj.createdDate === "string" ? obj.createdDate : null,
        updatedDate: typeof obj.updatedDate === "string" ? obj.updatedDate : null,
    };
}

export default function StudentMeetingDetailPage() {
    const params = useParams<{ id: string }>();
    const meetingId = params.id;

    const [loading, setLoading] = useState(true);
    const [meeting, setMeeting] = useState<Meeting | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);

            const res = await fetch(`/api/student/meetings/${meetingId}`, {
                cache: "no-store",
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to load meeting detail");
                setLoading(false);
                return;
            }

            setMeeting(normalizeMeeting(data));
            setLoading(false);
        }

        void load();
    }, [meetingId]);

    const modeLabel = useMemo(() => {
        if (!meeting?.mode) return "—";
        return meeting.mode === "IN_PERSON" ? "In Person" : "Virtual";
    }, [meeting]);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Meeting Detail</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View full information for this scheduled meeting.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="secondary" className="w-full sm:w-auto">
                        <Link href="/student/meetings">Back</Link>
                    </Button>

                    {meeting?.link ? (
                        <Button asChild className="w-full sm:w-auto">
                            <a href={meeting.link} target="_blank" rel="noreferrer">
                                Join Meeting
                            </a>
                        </Button>
                    ) : null}
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>
                        {loading ? "Loading..." : meeting?.description || "Meeting Information"}
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading meeting detail...</p>
                    ) : !meeting ? (
                        <p className="text-sm text-muted-foreground">Meeting information is not available.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Mode</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge variant="outline">{modeLabel}</Badge>
                                    {meeting.status ? <Badge>{meeting.status}</Badge> : null}
                                </div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Virtual Platform</div>
                                <div className="mt-1 font-medium">{meeting.virtualPlatform ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Start</div>
                                <div className="mt-1 font-medium">{formatDate(meeting.startDate)}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">End</div>
                                <div className="mt-1 font-medium">{formatDate(meeting.endDate)}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Location</div>
                                <div className="mt-1 font-medium">{meeting.location || "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Meeting Link</div>
                                <div className="mt-1 font-medium break-all">
                                    {meeting.link ? (
                                        <a
                                            href={meeting.link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 underline"
                                        >
                                            {meeting.link}
                                        </a>
                                    ) : (
                                        "—"
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4 md:col-span-2">
                                <div className="text-sm text-muted-foreground">Description</div>
                                <div className="mt-1 whitespace-pre-wrap font-medium">
                                    {meeting.description || "—"}
                                </div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Created Date</div>
                                <div className="mt-1 font-medium">{formatDate(meeting.createdDate)}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Updated Date</div>
                                <div className="mt-1 font-medium">{formatDate(meeting.updatedDate)}</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}