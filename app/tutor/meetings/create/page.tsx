"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
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

type AllocationSlot = {
    scheduleStart: string;
    scheduleEnd: string;
};

type AllocatedStudent = {
    student: Student;
    allocationSlots: AllocationSlot[];
};

type MeetingMode = "VIRTUAL" | "IN_PERSON";

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

// Backend slot format: dd/MM/yyyy HH:mm
function backendSlotToUtcIso(value: string) {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (!match) return "";

    const [, dd, mm, yyyy, hh, min] = match;

    const utcMs = Date.UTC(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        Number(hh),
        Number(min),
        0,
        0
    );

    return new Date(utcMs).toISOString();
}

function formatSlotLabel(start: string, end: string) {
    return `${start} → ${end}`;
}

export default function TutorMeetingCreatePage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-4xl p-6">Loading...</div>}>
            <TutorMeetingCreatePageContent />
        </Suspense>
    );
}

function TutorMeetingCreatePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const meetingId = searchParams.get("id");
    const isEdit = Boolean(meetingId);

    const [allocatedStudents, setAllocatedStudents] = useState<AllocatedStudent[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [studentUserId, setStudentUserId] = useState("");
    const [selectedSlotIndex, setSelectedSlotIndex] = useState("");

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [selectedSlotStartIso, setSelectedSlotStartIso] = useState("");
    const [selectedSlotEndIso, setSelectedSlotEndIso] = useState("");

    const [mode, setMode] = useState<MeetingMode>("VIRTUAL");
    const [location, setLocation] = useState("Online");
    const [link, setLink] = useState("");
    const [description, setDescription] = useState("");

    const selectedAllocatedStudent = useMemo(() => {
        return allocatedStudents.find((item) => item.student.id === studentUserId) ?? null;
    }, [allocatedStudents, studentUserId]);

    const currentSlots = useMemo(() => {
        return selectedAllocatedStudent?.allocationSlots ?? [];
    }, [selectedAllocatedStudent]);

    useEffect(() => {
        let active = true;

        async function run() {
            setPageLoading(true);

            try {
                const studentsPromise = fetch("/api/tutor/allocated-students", {
                    cache: "no-store",
                });

                const meetingPromise = meetingId
                    ? await fetch(`/api/tutor/meetings/${meetingId}`, {
                        cache: "no-store",
                    })
                    : null;

                const studentsRes = await studentsPromise;
                const studentsData = await studentsRes.json().catch(() => ({}));

                if (!studentsRes.ok) {
                    throw new Error(studentsData?.message ?? "Failed to load allocated students");
                }

                if (active) {
                    setAllocatedStudents(Array.isArray(studentsData) ? studentsData : []);
                }

                if (meetingPromise) {
                    const meetingRes = await meetingPromise;
                    const meetingData = await meetingRes.json().catch(() => ({}));

                    if (!meetingRes.ok) {
                        throw new Error(meetingData?.message ?? "Failed to load meeting");
                    }

                    if (active) {
                        setStudentUserId(meetingData.studentUserId ?? "");
                        setSelectedSlotStartIso(meetingData.startDate ?? "");
                        setSelectedSlotEndIso(meetingData.endDate ?? "");
                        setStartDate(isoToLocalInput(meetingData.startDate));
                        setEndDate(isoToLocalInput(meetingData.endDate));
                        setMode(meetingData.mode ?? "VIRTUAL");
                        setLocation(
                            meetingData.location ?? (meetingData.mode === "IN_PERSON" ? "" : "Online")
                        );
                        setLink(meetingData.link ?? "");
                        setDescription(meetingData.description ?? "");
                    }
                }
            } catch (error) {
                if (active) {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : "Something went wrong while loading the page"
                    );
                }
            } finally {
                if (active) {
                    setPageLoading(false);
                }
            }
        }

        void run();

        return () => {
            active = false;
        };
    }, [meetingId]);

    useEffect(() => {
        if (mode === "IN_PERSON") {
            setLink("");
            if (location === "Online") {
                setLocation("");
            }
        } else if (!location) {
            setLocation("Online");
        }
    }, [mode, location]);

    useEffect(() => {
        setSelectedSlotIndex("");

        if (!isEdit) {
            setSelectedSlotStartIso("");
            setSelectedSlotEndIso("");
            setStartDate("");
            setEndDate("");
        }
    }, [studentUserId, isEdit]);

    useEffect(() => {
        if (!selectedSlotIndex) return;

        const slot = currentSlots[Number(selectedSlotIndex)];
        if (!slot) return;

        const startIso = backendSlotToUtcIso(slot.scheduleStart);
        const endIso = backendSlotToUtcIso(slot.scheduleEnd);

        setSelectedSlotStartIso(startIso);
        setSelectedSlotEndIso(endIso);
        setStartDate(isoToLocalInput(startIso));
        setEndDate(isoToLocalInput(endIso));
    }, [selectedSlotIndex, currentSlots]);

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!studentUserId) {
            toast.error("Please select a student.");
            return;
        }

        if (!selectedSlotStartIso || !selectedSlotEndIso) {
            toast.error("Please select an allocation slot.");
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

        setSaving(true);

        const payload = {
            studentUserId,
            startDate: selectedSlotStartIso,
            endDate: selectedSlotEndIso,
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
            toast.error("Failed to save meeting");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">
                    {isEdit ? "Edit Meeting" : "Schedule New Meeting"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Create a meeting using the allocated time slot of the selected student.
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
                                        <SelectValue
                                            placeholder={
                                                pageLoading ? "Loading students..." : "Choose a student"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allocatedStudents.map((item) => (
                                            <SelectItem key={item.student.id} value={item.student.id}>
                                                {fullName(item.student)} ({item.student.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Available Allocation Slot</label>
                                <Select value={selectedSlotIndex} onValueChange={setSelectedSlotIndex}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose one allocated slot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currentSlots.map((slot, index) => (
                                            <SelectItem key={`${slot.scheduleStart}-${slot.scheduleEnd}-${index}`} value={String(index)}>
                                                {formatSlotLabel(slot.scheduleStart, slot.scheduleEnd)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Tutors can only create meetings within the allocated slot for the selected student.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mode</label>
                                <Select
                                    value={mode}
                                    onValueChange={(value) => setMode(value as MeetingMode)}
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
                                    placeholder={mode === "IN_PERSON" ? "Enter location" : "Online"}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start Date & Time</label>
                                <Input type="datetime-local" value={startDate} readOnly disabled />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">End Date & Time</label>
                                <Input type="datetime-local" value={endDate} readOnly disabled />
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
                                <label className="text-sm font-medium">Notes / Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Write meeting notes or short description..."
                                    className="min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={saving || pageLoading}>
                                {saving ? "Saving..." : isEdit ? "Update Meeting" : "Save Meeting"}
                            </Button>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.push("/tutor/meetings")}
                                disabled={saving}
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