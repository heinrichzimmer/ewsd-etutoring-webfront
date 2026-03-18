"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function StudentMeetingDetailPage() {
    const params = useParams<{ id: string }>();
    const [meeting, setMeeting] = useState<Meeting | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    async function load() {
        const res = await fetch(`/api/student/meetings/${params.id}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load meeting");
            return;
        }

        setMeeting(data);
    }

    useEffect(() => {
        if (params.id) load();
    }, [load, params.id]);

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Meeting Detail</h1>

            <Card className="max-w-3xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Meeting Information</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div>
                        <div className="text-sm font-medium">Start</div>
                        <div className="text-sm text-muted-foreground">{formatDate(meeting?.startDate)}</div>
                    </div>

                    <div>
                        <div className="text-sm font-medium">End</div>
                        <div className="text-sm text-muted-foreground">{formatDate(meeting?.endDate)}</div>
                    </div>

                    <div>
                        <div className="text-sm font-medium">Mode</div>
                        <div className="text-sm text-muted-foreground">{meeting?.mode ?? "-"}</div>
                    </div>

                    <div>
                        <div className="text-sm font-medium">Location</div>
                        <div className="text-sm text-muted-foreground">{meeting?.location ?? "-"}</div>
                    </div>

                    <div>
                        <div className="text-sm font-medium">Meeting Link</div>
                        <div className="text-sm text-muted-foreground">
                            {meeting?.link ? (
                                <a
                                    href={meeting.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 underline"
                                >
                                    {meeting.link}
                                </a>
                            ) : (
                                "-"
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="text-sm font-medium">Description</div>
                        <div className="text-sm text-muted-foreground">{meeting?.description ?? "-"}</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}