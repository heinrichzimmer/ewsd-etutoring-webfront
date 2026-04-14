"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Role = "ADMIN" | "TUTOR" | "STUDENT";

type User = {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
};

type Allocation = {
    id: string;
    studentUserId: string;
    tutorUserId: string;
    allocatedById: string;
    allocatedDate: string;
    endedDate: string | null;
    reason: string | null;
    scheduleStart: string;
    scheduleEnd: string;
};

type PreviewItem = {
    studentUserId: string;
    tutorUserId: string;
    reason?: string | null;
    scheduleStart: string;
    scheduleEnd: string;
    [key: string]: any;
};

const ITEMS_PER_PAGE = 5;

function fullName(u: User) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;
}

function toIsoFromDatetimeLocal(value: string) {
    return new Date(value).toISOString();
}

function formatPreviewDateTime(value: string) {
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

function formatScheduleRange(start?: string, end?: string) {
    if (!start || !end) return "-";
    return `${formatPreviewDateTime(start)} → ${formatPreviewDateTime(end)}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
    if (!time) return "";
    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";

    const total = hours * 60 + minutes + minutesToAdd;
    const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);

    const hh = String(Math.floor(normalized / 60)).padStart(2, "0");
    const mm = String(normalized % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

export default function AllocatePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [tutors, setTutors] = useState<User[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);

    const [singleOpen, setSingleOpen] = useState(false);
    const [singleStudentId, setSingleStudentId] = useState<string | null>(null);
    const [singleTutorId, setSingleTutorId] = useState("");
    const [singleStart, setSingleStart] = useState("");
    const [singleEnd, setSingleEnd] = useState("");
    const [singleReason, setSingleReason] = useState("");

    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkTutorId, setBulkTutorId] = useState("");
    const [bulkReason, setBulkReason] = useState("");
    const [bulkDate, setBulkDate] = useState("");
    const [bulkStartTime, setBulkStartTime] = useState("");
    const [bulkSlotDurationMinutes, setBulkSlotDurationMinutes] = useState<number>(60);
    const [bulkTimeZoneId, setBulkTimeZoneId] = useState("Asia/Yangon");

    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

    const tutorById = useMemo(() => {
        const m = new Map<string, User>();
        tutors.forEach((t) => m.set(t.id, t));
        return m;
    }, [tutors]);

    const studentById = useMemo(() => {
        const m = new Map<string, User>();
        students.forEach((s) => m.set(s.id, s));
        return m;
    }, [students]);

    const allocationByStudentId = useMemo(() => {
        const m = new Map<string, Allocation>();
        for (const a of allocations) {
            m.set(a.studentUserId, a);
        }
        return m;
    }, [allocations]);

    const selectedStudents = useMemo(() => {
        return Array.from(selectedIds)
            .map((id) => studentById.get(id))
            .filter((x): x is User => Boolean(x));
    }, [selectedIds, studentById]);

    const calculatedBulkEndTime = useMemo(() => {
        if (!bulkStartTime || !bulkSlotDurationMinutes || bulkSlotDurationMinutes <= 0) return "";
        return addMinutesToTime(bulkStartTime, bulkSlotDurationMinutes);
    }, [bulkStartTime, bulkSlotDurationMinutes]);

    const totalPages = Math.max(1, Math.ceil(students.length / ITEMS_PER_PAGE));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return students.slice(start, start + ITEMS_PER_PAGE);
    }, [students, currentPage]);

    async function fetchData() {
        setLoading(true);
        setError(null);

        try {
            const [tRes, sRes, aRes] = await Promise.all([
                fetch("/api/staff/tutors"),
                fetch("/api/staff/students"),
                fetch("/api/staff/allocations?page=0&size=100&search="),
            ]);

            const tData = await tRes.json().catch(() => null);
            const sData = await sRes.json().catch(() => null);
            const aData = await aRes.json().catch(() => null);

            if (!tRes.ok) throw new Error(tData?.message ?? "Failed to load tutors");
            if (!sRes.ok) throw new Error(sData?.message ?? "Failed to load students");
            if (!aRes.ok) throw new Error(aData?.message ?? "Failed to load allocations");

            setTutors(Array.isArray(tData) ? tData : tData?.content ?? []);
            setStudents(Array.isArray(sData) ? sData : sData?.content ?? []);
            setAllocations(aData?.content ?? []);
        } catch (e: any) {
            const msg = e?.message ?? "Something went wrong";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void fetchData();
    }, []);

    function toggleSelect(id: string, checked: boolean) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }

    function openSingle(studentId: string) {
        setSingleStudentId(studentId);
        setSingleTutorId("");
        setSingleStart("");
        setSingleEnd("");
        setSingleReason("");
        setSingleOpen(true);
    }

    async function createAllocation(payload: {
        studentUserId: string;
        tutorUserId: string;
        reason?: string;
        scheduleStart: string;
        scheduleEnd: string;
    }) {
        const res = await fetch("/api/staff/allocations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message ?? "Allocation failed");
        return data;
    }

    async function updateAllocation(
        id: string,
        payload: {
            studentUserId?: string;
            tutorUserId?: string;
            reason?: string;
            scheduleStart?: string;
            scheduleEnd?: string;
        }
    ) {
        const res = await fetch(`/api/staff/allocations/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message ?? "Reallocation failed");
        return data;
    }

    async function undoAllocation(id: string) {
        const res = await fetch(`/api/staff/allocations/${id}/undo`, {
            method: "POST",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message ?? "Undo failed");
        return data;
    }

    async function readError(res: Response) {
        const data = await res.json().catch(() => ({}));
        return data?.message || data?.raw || "Something went wrong";
    }

    async function onSingleConfirm() {
        if (!singleStudentId) return;
        setError(null);

        if (!singleTutorId) {
            toast.error("Please select a tutor.");
            return;
        }

        if (!singleStart || !singleEnd) {
            toast.error("Please select schedule start and end.");
            return;
        }

        const scheduleStart = toIsoFromDatetimeLocal(singleStart);
        const scheduleEnd = toIsoFromDatetimeLocal(singleEnd);

        try {
            const existing = allocationByStudentId.get(singleStudentId);

            if (existing) {
                await updateAllocation(existing.id, {
                    tutorUserId: singleTutorId,
                    reason: singleReason || undefined,
                    scheduleStart,
                    scheduleEnd,
                });
                toast.success("Allocation updated successfully.");
            } else {
                await createAllocation({
                    studentUserId: singleStudentId,
                    tutorUserId: singleTutorId,
                    reason: singleReason || undefined,
                    scheduleStart,
                    scheduleEnd,
                });
                toast.success("Allocation created successfully.");
            }

            setSingleOpen(false);
            await fetchData();
        } catch (e: any) {
            const msg = e?.message ?? "Allocation failed";
            setError(msg);
            toast.error(msg);
        }
    }

    async function onBulkPreview() {
        const studentUserIds = Array.from(selectedIds);

        if (!studentUserIds.length) return toast.error("Select at least 1 student.");
        if (!bulkTutorId) return toast.error("Select a tutor.");
        if (!bulkDate) return toast.error("Select a date.");
        if (!bulkSlotDurationMinutes || bulkSlotDurationMinutes <= 0) {
            return toast.error("Slot duration must be greater than 0.");
        }
        if (!bulkTimeZoneId) return toast.error("Time zone is required.");

        setPreviewLoading(true);

        try {
            const res = await fetch("/api/staff/allocations/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: bulkDate,
                    startTime: bulkStartTime ? bulkStartTime : null,
                    slotDurationMinutes: bulkSlotDurationMinutes,
                    tutorUserId: bulkTutorId,
                    studentUserIds,
                    reason: bulkReason || null,
                    timeZoneId: bulkTimeZoneId,
                }),
            });

            if (!res.ok) {
                toast.error(await readError(res));
                return;
            }

            const data = await res.json().catch(() => ({}));
            const items: PreviewItem[] = Array.isArray(data)
                ? data
                : (data.items ?? data.content ?? []);

            if (!items.length) {
                toast.error("Preview returned no slots. Try different date/time.");
                return;
            }

            setPreviewItems(items);
            toast.success("Preview generated. Review and confirm.");
        } catch {
            toast.error("Network error while generating preview.");
        } finally {
            setPreviewLoading(false);
        }
    }

    async function onBulkConfirmFromPreview() {
        if (!previewItems.length) {
            toast.error("Please preview first.");
            return;
        }

        try {
            const res = await fetch("/api/staff/allocations/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: previewItems.map((p) => ({
                        studentUserId: p.studentUserId,
                        tutorUserId: p.tutorUserId ?? bulkTutorId,
                        reason: (p.reason ?? bulkReason) || null,
                        scheduleStart: p.scheduleStart,
                        scheduleEnd: p.scheduleEnd,
                    })),
                }),
            });

            if (!res.ok) {
                toast.error(await readError(res));
                return;
            }

            toast.success("Bulk allocation completed.");
            setBulkOpen(false);
            setSelectedIds(new Set());
            setPreviewItems([]);
            await fetchData();
        } catch {
            toast.error("Network error while creating bulk allocation.");
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-semibold">Allocate / Reallocate Students</h1>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                        onClick={() => setBulkOpen(true)}
                        disabled={selectedIds.size === 0}
                        className="w-full sm:w-auto"
                    >
                        Bulk Assign ({selectedIds.size})
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setSelectedIds(new Set())}
                        disabled={selectedIds.size === 0}
                        className="w-full sm:w-auto"
                    >
                        Clear Selection
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Card className="shadow-sm">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">Student List</CardTitle>
                    <Badge variant="outline" className="w-fit">
                        {students.length} students
                    </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <>
                            <div className="hidden overflow-auto rounded-lg border bg-white md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">Sel</TableHead>
                                            <TableHead className="w-15">No</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Tutor</TableHead>
                                            <TableHead>Schedule</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {paginatedStudents.map((s, idx) => {
                                            const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                                            const allocation = allocationByStudentId.get(s.id);
                                            const assigned = Boolean(allocation);
                                            const tutor = allocation ? tutorById.get(allocation.tutorUserId) : null;

                                            return (
                                                <TableRow key={s.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedIds.has(s.id)}
                                                            onCheckedChange={(v) => toggleSelect(s.id, Boolean(v))}
                                                            aria-label={`Select ${fullName(s)}`}
                                                        />
                                                    </TableCell>

                                                    <TableCell>{rowNumber}</TableCell>
                                                    <TableCell className="font-medium">{fullName(s)}</TableCell>
                                                    <TableCell>{s.email}</TableCell>
                                                    <TableCell>{tutor ? fullName(tutor) : "-"}</TableCell>

                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {allocation ? (
                                                            <div className="space-y-1">
                                                                <div>{allocation.scheduleStart}</div>
                                                                <div>→ {allocation.scheduleEnd}</div>
                                                            </div>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        {assigned ? (
                                                            <Badge variant="secondary">Assigned</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">Unassigned</Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="space-x-2 text-right">
                                                        <Button size="sm" onClick={() => openSingle(s.id)}>
                                                            {assigned ? "Reassign" : "Assign"}
                                                        </Button>

                                                        {allocation && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={async () => {
                                                                    setError(null);
                                                                    try {
                                                                        await undoAllocation(allocation.id);
                                                                        toast.success("Allocation ended successfully.");
                                                                        await fetchData();
                                                                    } catch (e: any) {
                                                                        const msg = e?.message ?? "Undo failed";
                                                                        setError(msg);
                                                                        toast.error(msg);
                                                                    }
                                                                }}
                                                            >
                                                                End
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}

                                        {paginatedStudents.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                                    No students found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="grid gap-3 md:hidden">
                                {paginatedStudents.length === 0 ? (
                                    <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                        No students found.
                                    </div>
                                ) : (
                                    paginatedStudents.map((s, idx) => {
                                        const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                                        const allocation = allocationByStudentId.get(s.id);
                                        const assigned = Boolean(allocation);
                                        const tutor = allocation ? tutorById.get(allocation.tutorUserId) : null;

                                        return (
                                            <div key={s.id} className="rounded-xl border bg-white p-4 shadow-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-xs text-muted-foreground">#{rowNumber}</div>
                                                        <div className="truncate font-medium">{fullName(s)}</div>
                                                        <div className="truncate text-sm text-muted-foreground">{s.email}</div>
                                                    </div>

                                                    <Checkbox
                                                        checked={selectedIds.has(s.id)}
                                                        onCheckedChange={(v) => toggleSelect(s.id, Boolean(v))}
                                                        aria-label={`Select ${fullName(s)}`}
                                                    />
                                                </div>

                                                <div className="mt-3 grid gap-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Tutor: </span>
                                                        <span>{tutor ? fullName(tutor) : "-"}</span>
                                                    </div>

                                                    <div>
                                                        <span className="text-muted-foreground">Schedule: </span>
                                                        <span className="text-xs">
                              {allocation
                                  ? formatScheduleRange(allocation.scheduleStart, allocation.scheduleEnd)
                                  : "-"}
                            </span>
                                                    </div>

                                                    <div>
                                                        {assigned ? (
                                                            <Badge variant="secondary">Assigned</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">Unassigned</Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openSingle(s.id)}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        {assigned ? "Reassign" : "Assign"}
                                                    </Button>

                                                    {allocation && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="w-full sm:w-auto"
                                                            onClick={async () => {
                                                                setError(null);
                                                                try {
                                                                    await undoAllocation(allocation.id);
                                                                    toast.success("Allocation ended successfully.");
                                                                    await fetchData();
                                                                } catch (e: any) {
                                                                    const msg = e?.message ?? "Undo failed";
                                                                    setError(msg);
                                                                    toast.error(msg);
                                                                }
                                                            }}
                                                        >
                                                            End
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {!loading && students.length > 0 && (
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
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign / Reassign Student</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Student:{" "}
                            <span className="font-medium text-foreground">
                {singleStudentId && studentById.get(singleStudentId)
                    ? fullName(studentById.get(singleStudentId)!)
                    : "-"}
              </span>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Select Tutor</div>
                            <Select value={singleTutorId} onValueChange={setSingleTutorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a tutor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tutors.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {fullName(t)} ({t.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Schedule Start</div>
                                <Input
                                    type="datetime-local"
                                    value={singleStart}
                                    onChange={(e) => setSingleStart(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-medium">Schedule End</div>
                                <Input
                                    type="datetime-local"
                                    value={singleEnd}
                                    onChange={(e) => setSingleEnd(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Reason (optional)</div>
                            <Input
                                value={singleReason}
                                onChange={(e) => setSingleReason(e.target.value)}
                                placeholder="e.g., Math support"
                            />
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Schedule is required. Backend will reject overlapping tutor schedules.
                        </p>
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button
                            variant="secondary"
                            onClick={() => setSingleOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button onClick={onSingleConfirm} className="w-full sm:w-auto">
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={bulkOpen}
                onOpenChange={(open) => {
                    setBulkOpen(open);
                    if (!open) setPreviewItems([]);
                }}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Bulk Assign Students (Preview → Confirm)</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                            <div>
                                Selected students: <span className="font-semibold">{selectedIds.size}</span>
                            </div>
                            {selectedStudents.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedStudents.map((student) => (
                                        <Badge key={student.id} variant="secondary">
                                            {fullName(student)}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Select Tutor</div>
                            <Select
                                value={bulkTutorId}
                                onValueChange={(v) => {
                                    setBulkTutorId(v);
                                    setPreviewItems([]);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a tutor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tutors.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {fullName(t)} ({t.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Date</div>
                                <Input
                                    type="date"
                                    value={bulkDate}
                                    onChange={(e) => {
                                        setBulkDate(e.target.value);
                                        setPreviewItems([]);
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-medium">Start Time (optional)</div>
                                <Input
                                    type="time"
                                    value={bulkStartTime}
                                    onChange={(e) => {
                                        setBulkStartTime(e.target.value);
                                        setPreviewItems([]);
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-medium">Calculated End Time</div>
                                <Input
                                    value={calculatedBulkEndTime || "Auto generated"}
                                    disabled
                                    placeholder="Auto generated"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-medium">Slot Duration (minutes)</div>
                                <Input
                                    type="number"
                                    min={15}
                                    step={15}
                                    value={bulkSlotDurationMinutes}
                                    onChange={(e) => {
                                        setBulkSlotDurationMinutes(Number(e.target.value));
                                        setPreviewItems([]);
                                    }}
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                                <div className="text-sm font-medium">Time Zone</div>
                                <Input
                                    value={bulkTimeZoneId}
                                    onChange={(e) => {
                                        setBulkTimeZoneId(e.target.value);
                                        setPreviewItems([]);
                                    }}
                                />
                                <div className="text-xs text-muted-foreground">
                                    Example: Asia/Yangon
                                </div>
                            </div>
                        </div>

                        <div className="rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            Bulk preview does not take a manual end date/end time. The backend calculates
                            each student&apos;s <span className="font-medium">scheduleEnd</span> from the selected
                            date, start time, and slot duration.
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Reason (optional)</div>
                            <Input
                                value={bulkReason}
                                onChange={(e) => {
                                    setBulkReason(e.target.value);
                                    setPreviewItems([]);
                                }}
                                placeholder="e.g., Math support"
                            />
                        </div>

                        {previewItems.length > 0 && (
                            <div className="space-y-3">
                                <div className="text-sm font-medium">Preview Result</div>

                                <div className="hidden overflow-auto rounded-lg border bg-white md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student</TableHead>
                                                <TableHead>Schedule Start</TableHead>
                                                <TableHead>Schedule End</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {previewItems.map((p, idx) => {
                                                const student = studentById.get(p.studentUserId);

                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span>{student ? fullName(student) : p.studentUserId}</span>
                                                                {student?.email && (
                                                                    <span className="text-xs text-muted-foreground">
                                    {student.email}
                                  </span>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="text-sm">
                                                            {formatPreviewDateTime(p.scheduleStart)}
                                                        </TableCell>

                                                        <TableCell className="text-sm">
                                                            {formatPreviewDateTime(p.scheduleEnd)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="grid gap-3 md:hidden">
                                    {previewItems.map((p, idx) => {
                                        const student = studentById.get(p.studentUserId);

                                        return (
                                            <div key={idx} className="rounded-xl border bg-white p-4 shadow-sm">
                                                <div className="font-medium">
                                                    {student ? fullName(student) : p.studentUserId}
                                                </div>
                                                {student?.email && (
                                                    <div className="mt-1 text-sm text-muted-foreground">{student.email}</div>
                                                )}

                                                <div className="mt-3 space-y-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Start: </span>
                                                        <span>{formatPreviewDateTime(p.scheduleStart)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">End: </span>
                                                        <span>{formatPreviewDateTime(p.scheduleEnd)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => setBulkOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={onBulkPreview}
                            disabled={previewLoading}
                            className="w-full sm:w-auto"
                        >
                            {previewLoading ? "Previewing..." : "Preview Slots"}
                        </Button>

                        <Button
                            onClick={onBulkConfirmFromPreview}
                            disabled={!previewItems.length}
                            className="w-full sm:w-auto"
                        >
                            Confirm Bulk Allocate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}