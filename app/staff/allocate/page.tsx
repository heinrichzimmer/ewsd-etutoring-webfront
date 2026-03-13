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

export default function AllocatePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [tutors, setTutors] = useState<User[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Single dialog
    const [singleOpen, setSingleOpen] = useState(false);
    const [singleStudentId, setSingleStudentId] = useState<string | null>(null);
    const [singleTutorId, setSingleTutorId] = useState("");
    const [singleStart, setSingleStart] = useState("");
    const [singleEnd, setSingleEnd] = useState("");
    const [singleReason, setSingleReason] = useState("");

    // Bulk dialog
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
        fetchData();
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

    async function updateAllocation(id: string, payload: {
        studentUserId?: string;
        tutorUserId?: string;
        reason?: string;
        scheduleStart?: string;
        scheduleEnd?: string;
    }) {
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-semibold">Allocate / Reallocate Students</h1>

                <div className="flex items-center gap-2">
                    <Button onClick={() => setBulkOpen(true)} disabled={selectedIds.size === 0}>
                        Bulk Assign ({selectedIds.size})
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setSelectedIds(new Set())}
                        disabled={selectedIds.size === 0}
                    >
                        Clear Selection
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Student List</CardTitle>
                    <Badge variant="outline">Sprint 1</Badge>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <div className="rounded-lg border bg-white overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[48px]">Sel</TableHead>
                                        <TableHead className="w-[60px]">No</TableHead>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Tutor</TableHead>
                                        <TableHead>Schedule</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {students.map((s, idx) => {
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

                                                <TableCell>{idx + 1}</TableCell>
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

                                                <TableCell className="text-right space-x-2">
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
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign / Reassign Student</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    <DialogFooter className="gap-2">
                        <Button variant="secondary" onClick={() => setSingleOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={onSingleConfirm}>Confirm</Button>
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
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Bulk Assign Students (Preview → Confirm)</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="text-sm">
                            Selected students: <span className="font-semibold">{selectedIds.size}</span>
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                            <div className="space-y-2">
                                <div className="text-sm font-medium">Time Zone</div>
                                <Input
                                    value={bulkTimeZoneId}
                                    onChange={(e) => {
                                        setBulkTimeZoneId(e.target.value);
                                        setPreviewItems([]);
                                    }}
                                />
                                <div className="text-xs text-muted-foreground">Example: Asia/Yangon</div>
                            </div>
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
                            <>
                                <div className="text-sm font-medium">Preview Result</div>

                                <div className="rounded-lg border bg-white overflow-auto max-h-[260px]">
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
                            </>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="secondary" onClick={() => setBulkOpen(false)}>
                            Cancel
                        </Button>

                        <Button variant="secondary" onClick={onBulkPreview} disabled={previewLoading}>
                            {previewLoading ? "Previewing..." : "Preview Slots"}
                        </Button>

                        <Button onClick={onBulkConfirmFromPreview} disabled={!previewItems.length}>
                            Confirm Bulk Allocate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}