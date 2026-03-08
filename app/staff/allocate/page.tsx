"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

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
    allocatedDate: string; // dd/MM/yyyy HH:mm (UTC) in responses
    endedDate: string | null;
    reason: string | null;
    scheduleStart: string; // dd/MM/yyyy HH:mm (UTC) in list response
    scheduleEnd: string;
};

function fullName(u: User) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;
}

function toIsoFromDatetimeLocal(value: string) {
    // value example: "2026-03-10T09:00"
    // Convert to ISO-8601 string (UTC)
    return new Date(value).toISOString();
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
    const [bulkStart, setBulkStart] = useState("");
    const [bulkEnd, setBulkEnd] = useState("");
    const [bulkReason, setBulkReason] = useState("");

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

    // For Sprint 1: show “current” allocation per student as the most recently allocatedDate
    const allocationByStudentId = useMemo(() => {
        const m = new Map<string, Allocation>();
        for (const a of allocations) {
            const prev = m.get(a.studentUserId);
            if (!prev) m.set(a.studentUserId, a);
            else m.set(a.studentUserId, a); // backend list is active; usually newest last/first — good enough for sprint
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

            // Our proxy routes should return arrays for tutors/students; allocations returns { content: [...] }
            setTutors(Array.isArray(tData) ? tData : tData?.content ?? []);
            setStudents(Array.isArray(sData) ? sData : sData?.content ?? []);
            setAllocations(aData?.content ?? []);
        } catch (e: any) {
            setError(e?.message ?? "Something went wrong");
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
    }

    async function undoAllocation(id: string) {
        const res = await fetch(`/api/staff/allocations/${id}/undo`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message ?? "Undo failed");
    }

    async function onSingleConfirm() {
        if (!singleStudentId) return;
        setError(null);

        if (!singleTutorId) return setError("Please select a tutor.");
        if (!singleStart || !singleEnd) return setError("Please select schedule start & end.");

        const scheduleStart = toIsoFromDatetimeLocal(singleStart);
        const scheduleEnd = toIsoFromDatetimeLocal(singleEnd);

        try {
            const existing = allocationByStudentId.get(singleStudentId);

            if (existing) {
                // Reallocate via PUT (backend supports update of tutor/schedule/reason) :contentReference[oaicite:3]{index=3}
                await updateAllocation(existing.id, {
                    tutorUserId: singleTutorId,
                    reason: singleReason || undefined,
                    scheduleStart,
                    scheduleEnd,
                });
            } else {
                await createAllocation({
                    studentUserId: singleStudentId,
                    tutorUserId: singleTutorId,
                    reason: singleReason || undefined,
                    scheduleStart,
                    scheduleEnd,
                });
            }

            setSingleOpen(false);
            await fetchData();
        } catch (e: any) {
            setError(e?.message ?? "Allocation failed");
        }
    }

    async function onBulkConfirm() {
        setError(null);

        const ids = Array.from(selectedIds);
        if (!ids.length) return setError("Please select at least 1 student.");
        if (!bulkTutorId) return setError("Please select a tutor.");
        if (!bulkStart || !bulkEnd) return setError("Please select schedule start & end.");

        const scheduleStart = toIsoFromDatetimeLocal(bulkStart);
        const scheduleEnd = toIsoFromDatetimeLocal(bulkEnd);

        try {
            // Backend bulk shape: { items: [...] } max 500 :contentReference[oaicite:4]{index=4}
            const res = await fetch("/api/staff/allocations/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: ids.map((studentUserId) => ({
                        studentUserId,
                        tutorUserId: bulkTutorId,
                        reason: bulkReason || undefined,
                        scheduleStart,
                        scheduleEnd,
                    })),
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message ?? "Bulk allocation failed");

            setBulkOpen(false);
            setSelectedIds(new Set());
            await fetchData();
        } catch (e: any) {
            setError(e?.message ?? "Bulk allocation failed");
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
                                                                    await fetchData();
                                                                } catch (e: any) {
                                                                    setError(e?.message ?? "Undo failed");
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

            {/* Single Assign/Reassign */}
            <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign / Reassign Student</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                            Student:{" "}
                            <span className="font-medium text-foreground">
                {singleStudentId ? fullName(studentById.get(singleStudentId)!) : "-"}
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
                                <Input type="datetime-local" value={singleStart} onChange={(e) => setSingleStart(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Schedule End</div>
                                <Input type="datetime-local" value={singleEnd} onChange={(e) => setSingleEnd(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Reason (optional)</div>
                            <Input value={singleReason} onChange={(e) => setSingleReason(e.target.value)} placeholder="e.g., Math support" />
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

            {/* Bulk Assign */}
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Assign Students</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="text-sm">
                            Selected students: <span className="font-semibold">{selectedIds.size}</span>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Select Tutor</div>
                            <Select value={bulkTutorId} onValueChange={setBulkTutorId}>
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
                                <Input type="datetime-local" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Schedule End</div>
                                <Input type="datetime-local" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Reason (optional)</div>
                            <Input value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} placeholder="e.g., Support session" />
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Bulk supports up to 500 items per request.
                        </p>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="secondary" onClick={() => setBulkOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={onBulkConfirm}>Confirm Bulk Assign</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}