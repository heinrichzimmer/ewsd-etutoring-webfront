"use client";

import {
    Suspense,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

function isoToLocalInput(iso?: string | null) {
    if (!iso) return "";

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";

    const pad = (n: number) => String(n).padStart(2, "0");

    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());

    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function MeetingCreatePageFallback() {
    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Schedule New Meeting</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Loading meeting form...
                </p>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Create Meeting</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-6 text-sm text-muted-foreground">
                        Please wait...
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function TutorMeetingCreatePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const meetingId = searchParams.get("id");

    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);

    const [studentUserId, setStudentUserId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [mode, setMode] = useState<"VIRTUAL" | "IN_PERSON">("VIRTUAL");
    const [location, setLocation] = useState("Online");
    const [link, setLink] = useState("");
    const [description, setDescription] = useState("");

    const isEdit = useMemo(() => Boolean(meetingId), [meetingId]);

    useEffect(() => {
        async function loadStudents() {
            try {
                const res = await fetch("/api/tutor/allocated-students");
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    toast.error(data?.message ?? "Failed to load allocated students");
                    return;
                }

                setStudents(Array.isArray(data) ? data : data?.content ?? []);
            } catch {
                toast.error("Failed to load allocated students");
            }
        }

        async function loadMeeting() {
            if (!meetingId) return;

            try {
                const res = await fetch(`/api/tutor/meetings/${meetingId}`);
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    toast.error(data?.message ?? "Failed to load meeting");
                    return;
                }

                setStudentUserId(data.studentUserId ?? "");
                setStartDate(isoToLocalInput(data.startDate));
                setEndDate(isoToLocalInput(data.endDate));
                setMode(data.mode ?? "VIRTUAL");
                setLocation(data.location ?? (data.mode === "IN_PERSON" ? "" : "Online"));
                setLink(data.link ?? "");
                setDescription(data.description ?? "");
            } catch {
                toast.error("Failed to load meeting");
            }
        }

        loadStudents();
        loadMeeting();
    }, [meetingId]);

    useEffect(() => {
        if (mode === "IN_PERSON") {
            setLink("");
            if (location === "Online") {
                setLocation("");
            }
        } else {
            if (!location) {
                setLocation("Online");
            }
        }
    }, [mode, location]);

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!studentUserId) {
            toast.error("Please select a student.");
            return;
        }

        if (!startDate || !endDate) {
            toast.error("Please select start and end date.");
            return;
        }

        if (mode === "VIRTUAL" && !link) {
            toast.error("Meeting link is required for virtual meetings.");
            return;
        }

        if (mode === "IN_PERSON" && !location) {
            toast.error("Location is required for in-person meetings.");
            return;
        }

        setLoading(true);

        const payload = {
            studentUserId,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            mode,
            location: mode === "IN_PERSON" ? location : "Online",
            link: mode === "VIRTUAL" ? link : null,
            description,
        };

        try {
            const res = await fetch(
                isEdit ? `/api/tutor/meetings/${meetingId}` : "/api/tutor/meetings",
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to save meeting");
                return;
            }

            toast.success(isEdit ? "Meeting updated." : "Meeting created.");
            router.push("/tutor/meetings");
            router.refresh();
        } catch {
            toast.error("Something went wrong while saving the meeting.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">
                    {isEdit ? "Edit Meeting" : "Schedule New Meeting"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Create and manage tutor meeting sessions for your allocated students.
                </p>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {isEdit ? "Update Meeting" : "Create Meeting"}
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Select Student</label>
                                <Select value={studentUserId} onValueChange={setStudentUserId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose a student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {fullName(s)} ({s.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mode</label>
                                <Select
                                    value={mode}
                                    onValueChange={(v) =>
                                        setMode(v as "VIRTUAL" | "IN_PERSON")
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VIRTUAL">Virtual</SelectItem>
                                        <SelectItem value="IN_PERSON">In Person</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Location</label>
                                <Input
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder={
                                        mode === "IN_PERSON" ? "Enter location" : "Online"
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Start Date & Time
                                </label>
                                <Input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    End Date & Time
                                </label>
                                <Input
                                    type="datetime-local"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Meeting Link</label>
                                <Input
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="https://meet.example.com/abc"
                                    disabled={mode === "IN_PERSON"}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {mode === "IN_PERSON"
                                        ? "Meeting link is disabled for in-person meetings."
                                        : "Provide the online meeting link for virtual sessions."}
                                </p>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">
                                    Notes / Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Write meeting notes or short description..."
                                    className="min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={loading}>
                                {loading
                                    ? "Saving..."
                                    : isEdit
                                        ? "Update Meeting"
                                        : "Save Meeting"}
                            </Button>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.push("/tutor/meetings")}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function TutorMeetingCreatePage() {
    return (
        <Suspense fallback={<MeetingCreatePageFallback />}>
            <TutorMeetingCreatePageContent />
        </Suspense>
    );
}