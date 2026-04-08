"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type Role = "ADMIN" | "TUTOR" | "STUDENT";

type User = {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
};

type AllocationSlot = {
    scheduleStart: string;
    scheduleEnd: string;
};

type AllocatedStudentItem = {
    student: User;
    allocationSlots: AllocationSlot[];
};

type MeetingMode = "VIRTUAL" | "IN_PERSON";

type Meeting = {
    id: string;
    studentUserId: string;
    startDate: string;
    endDate: string;
    mode: MeetingMode;
    location?: string | null;
    link?: string | null;
    description?: string | null;
    virtualPlatform?: string | null;
};

function fullName(user?: Partial<User>) {
    if (!user) return "Unknown";
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || user.email || "Unknown";
}

function parseDateFlexible(value?: string | null): Date | null {
    if (!value) return null;

    const native = new Date(value);
    if (!Number.isNaN(native.getTime())) return native;

    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (match) {
        const [, dd, mm, yyyy, hh, min] = match;
        return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
    }

    return null;
}

function formatDateTime(value?: string | null) {
    const d = parseDateFlexible(value);
    if (!d) return value ?? "-";

    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDateForInput(date: Date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function formatTimeForInput(date: Date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function buildLocalIso(date: string, time: string) {
    return new Date(`${date}T${time}:00`).toISOString();
}

function timeToMinutes(value: string) {
    const [hh, mm] = value.split(":").map(Number);
    return hh * 60 + mm;
}

function makeTimeOptions(startMinutes = 9 * 60, endMinutes = 17 * 60, step = 30) {
    const items: string[] = [];

    for (let value = startMinutes; value <= endMinutes; value += step) {
        const hh = String(Math.floor(value / 60)).padStart(2, "0");
        const mm = String(value % 60).padStart(2, "0");
        items.push(`${hh}:${mm}`);
    }

    return items;
}

const START_TIME_OPTIONS = makeTimeOptions(9 * 60, 16 * 60 + 30, 30);
const END_TIME_OPTIONS = makeTimeOptions(9 * 60 + 30, 17 * 60, 30);

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
    };
}

export default function TutorMeetingEditPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const meetingId = params.id;

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<AllocatedStudentItem[]>([]);

    const [studentUserId, setStudentUserId] = useState("");
    const [mode, setMode] = useState<MeetingMode>("VIRTUAL");

    const [meetingDate, setMeetingDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const [location, setLocation] = useState("");
    const [link, setLink] = useState("");
    const [description, setDescription] = useState("");
    const [virtualPlatform, setVirtualPlatform] = useState("GOOGLE_MEET");

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function loadPage() {
            setLoading(true);

            const [meetingRes, studentsRes] = await Promise.all([
                fetch(`/api/tutor/meetings/${meetingId}`, { cache: "no-store" }),
                fetch("/api/tutor/allocated-students", { cache: "no-store" }),
            ]);

            const meetingData = await meetingRes.json().catch(() => ({}));
            const studentsData = await studentsRes.json().catch(() => ({}));

            if (!meetingRes.ok) {
                toast.error(meetingData?.message ?? "Failed to load meeting");
                setLoading(false);
                return;
            }

            if (!studentsRes.ok) {
                toast.error(studentsData?.message ?? "Failed to load allocated students");
                setLoading(false);
                return;
            }

            const meeting = normalizeMeeting(meetingData);
            if (!meeting) {
                toast.error("Invalid meeting data.");
                setLoading(false);
                return;
            }

            const allocatedStudents: AllocatedStudentItem[] = Array.isArray(studentsData)
                ? studentsData
                : studentsData?.content ?? [];

            setStudents(allocatedStudents);
            setStudentUserId(meeting.studentUserId);
            setMode(meeting.mode);
            setLocation(meeting.location ?? "");
            setLink(meeting.link ?? "");
            setDescription(meeting.description ?? "");
            setVirtualPlatform(meeting.virtualPlatform ?? "GOOGLE_MEET");

            const start = parseDateFlexible(meeting.startDate);
            const end = parseDateFlexible(meeting.endDate);

            if (start) {
                setMeetingDate(formatDateForInput(start));
                setStartTime(formatTimeForInput(start));
            }

            if (end) {
                setEndTime(formatTimeForInput(end));
            }

            setLoading(false);
        }

        void loadPage();
    }, [meetingId]);

    const selectedStudentItem = useMemo(() => {
        return students.find((item) => item.student.id === studentUserId) ?? null;
    }, [students, studentUserId]);

    const selectedSlots = selectedStudentItem?.allocationSlots ?? [];

    const availableRanges = useMemo(() => {
        return selectedSlots
            .map((slot) => {
                const start = parseDateFlexible(slot.scheduleStart);
                const end = parseDateFlexible(slot.scheduleEnd);
                if (!start || !end) return null;

                return {
                    start,
                    end,
                    label: `${formatDateTime(slot.scheduleStart)} → ${formatDateTime(slot.scheduleEnd)}`,
                };
            })
            .filter((x): x is { start: Date; end: Date; label: string } => x !== null);
    }, [selectedSlots]);

    const dateBounds = useMemo(() => {
        if (availableRanges.length === 0) return null;

        const minDate = new Date(Math.min(...availableRanges.map((x) => x.start.getTime())));
        const maxDate = new Date(Math.max(...availableRanges.map((x) => x.end.getTime())));

        return {
            min: formatDateForInput(minDate),
            max: formatDateForInput(maxDate),
        };
    }, [availableRanges]);

    function isWithinWorkingHours(start: string, end: string) {
        const startMinutes = timeToMinutes(start);
        const endMinutes = timeToMinutes(end);

        return (
            startMinutes >= 9 * 60 &&
            endMinutes <= 17 * 60 &&
            endMinutes > startMinutes
        );
    }

    function isInsideAllocationRange(date: string, start: string, end: string) {
        const chosenStart = new Date(`${date}T${start}:00`);
        const chosenEnd = new Date(`${date}T${end}:00`);

        return availableRanges.some((range) => chosenStart >= range.start && chosenEnd <= range.end);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!studentUserId) {
            toast.error("Please select a student.");
            return;
        }

        if (!meetingDate || !startTime || !endTime) {
            toast.error("Please choose date and time.");
            return;
        }

        if (!isWithinWorkingHours(startTime, endTime)) {
            toast.error("Meeting time must be within working hours (09:00 to 17:00).");
            return;
        }

        if (!isInsideAllocationRange(meetingDate, startTime, endTime)) {
            toast.error("Selected date and time must be inside the student's allocated range.");
            return;
        }

        const payload: Record<string, unknown> = {
            studentUserId,
            startDate: buildLocalIso(meetingDate, startTime),
            endDate: buildLocalIso(meetingDate, endTime),
            mode,
            description: description.trim(),
        };

        if (mode === "VIRTUAL") {
            if (!link.trim()) {
                toast.error("Please enter the meeting link.");
                return;
            }

            if (!virtualPlatform.trim()) {
                toast.error("Please choose the virtual platform.");
                return;
            }

            payload.link = link.trim();
            payload.virtualPlatform = virtualPlatform;
        } else {
            if (!location.trim()) {
                toast.error("Please enter the meeting location.");
                return;
            }

            payload.location = location.trim();
        }

        setSubmitting(true);

        try {
            const res = await fetch(`/api/tutor/meetings/${meetingId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to update meeting");
                return;
            }

            toast.success("Meeting updated successfully.");
            router.push("/tutor/meetings");
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    }

    useEffect(() => {
        if (mode === "VIRTUAL") {
            setLocation("");
        } else {
            setLink("");
            setVirtualPlatform("GOOGLE_MEET");
        }
    }, [mode]);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Edit Meeting</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Update the meeting while staying inside the student&#39;s allocated range and working hours.
                </p>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Update Meeting</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Student</label>
                            <Select value={studentUserId} onValueChange={setStudentUserId} disabled={loading}>
                                <SelectTrigger>
                                    <SelectValue placeholder={loading ? "Loading students..." : "Choose a student"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((item) => (
                                        <SelectItem key={item.student.id} value={item.student.id}>
                                            {fullName(item.student)} ({item.student.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mode</label>
                            <Select value={mode} onValueChange={(value) => setMode(value as MeetingMode)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VIRTUAL">Virtual</SelectItem>
                                    <SelectItem value="IN_PERSON">In Person</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Meeting Date</label>
                                <Input
                                    type="date"
                                    value={meetingDate}
                                    onChange={(e) => setMeetingDate(e.target.value)}
                                    min={dateBounds?.min}
                                    max={dateBounds?.max}
                                    disabled={!studentUserId}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start Time</label>
                                <Select value={startTime} onValueChange={setStartTime} disabled={!studentUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose start time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {START_TIME_OPTIONS.map((time) => (
                                            <SelectItem key={time} value={time}>
                                                {time}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">End Time</label>
                                <Select value={endTime} onValueChange={setEndTime} disabled={!studentUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose end time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {END_TIME_OPTIONS.filter((time) => {
                                            if (!startTime) return true;
                                            return timeToMinutes(time) > timeToMinutes(startTime);
                                        }).map((time) => (
                                            <SelectItem key={time} value={time}>
                                                {time}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {mode === "VIRTUAL" ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Virtual Platform</label>
                                        <Select value={virtualPlatform} onValueChange={setVirtualPlatform}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose platform" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                                                <SelectItem value="ZOOM">Zoom</SelectItem>
                                                <SelectItem value="MICROSOFT_TEAMS">Microsoft Teams</SelectItem>
                                                <SelectItem value="OTHER">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Location</label>
                                        <Input value="" disabled placeholder="Not used for virtual meetings" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Meeting Link</label>
                                    <Input
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        placeholder="https://meet.example.com/abc"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Location</label>
                                    <Input
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Room 101"
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Virtual Platform</label>
                                        <Input value="" disabled placeholder="Disabled for in-person meetings" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Meeting Link</label>
                                        <Input value="" disabled placeholder="Disabled for in-person meetings" />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Write meeting notes or short description..."
                                className="min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        {selectedSlots.length > 0 && (
                            <div className="rounded-md border bg-slate-50 p-4">
                                <div className="mb-2 text-sm font-medium">Available Allocation Ranges</div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                    {selectedSlots.map((slot, index) => (
                                        <div key={`${slot.scheduleStart}-${slot.scheduleEnd}-${index}`}>
                                            {formatDateTime(slot.scheduleStart)} → {formatDateTime(slot.scheduleEnd)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={submitting || loading}>
                                {submitting ? "Saving..." : "Save Changes"}
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