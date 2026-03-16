"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Student = {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
    isActive?: boolean;
    isLocked?: boolean;
    createdDate?: string | null;
    updatedDate?: string | null;
    lastLoginDate?: string | null;
};

type AllocationSlot = {
    scheduleStart: string;
    scheduleEnd: string;
};

type AllocatedStudent = {
    student: Student;
    allocationSlots: AllocationSlot[];
};

function fullName(u: Student) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;
}

export default function TutorStudentsPage() {
    const [items, setItems] = useState<AllocatedStudent[]>([]);
    const [query, setQuery] = useState("");

    async function load() {
        const res = await fetch("/api/tutor/allocated-students");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load allocated students");
            return;
        }

        setItems(Array.isArray(data) ? data : []);
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;

        return items.filter((item) => {
            const s = item.student;
            const text = `${fullName(s)} ${s.username ?? ""} ${s.email ?? ""}`.toLowerCase();
            return text.includes(q);
        });
    }, [items, query]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Assigned Students</h1>

                <div className="flex items-center gap-2">
                    <Input
                        className="w-65"
                        placeholder="Search student..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Badge variant="outline">{filtered.length} students</Badge>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Allocated Students</CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="overflow-auto rounded-lg border bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                            <tr className="border-b">
                                <th className="w-15 px-3 py-3 text-left">No</th>
                                <th className="px-3 py-3 text-left">Name</th>
                                <th className="px-3 py-3 text-left">Username</th>
                                <th className="px-3 py-3 text-left">Email</th>
                                <th className="px-3 py-3 text-left">Allocation Slots</th>
                                <th className="px-3 py-3 text-left">Status</th>
                            </tr>
                            </thead>

                            <tbody>
                            {filtered.map((item, idx) => {
                                const s = item.student;

                                return (
                                    <tr key={s.id} className="border-b align-top">
                                        <td className="px-3 py-3">{idx + 1}</td>

                                        <td className="px-3 py-3 font-medium">
                                            <div className="flex flex-col">
                                                <span>{fullName(s)}</span>
                                                {s.lastLoginDate && (
                                                    <span className="text-xs text-muted-foreground">
                              Last login: {s.lastLoginDate}
                            </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-3 py-3">{s.username}</td>

                                        <td className="px-3 py-3">{s.email}</td>

                                        <td className="px-3 py-3">
                                            {item.allocationSlots.length > 0 ? (
                                                <div className="space-y-2">
                                                    {item.allocationSlots.map((slot, slotIdx) => (
                                                        <div
                                                            key={slotIdx}
                                                            className="rounded-md border bg-slate-50 px-2 py-1 text-xs"
                                                        >
                                                            <div>{slot.scheduleStart}</div>
                                                            <div className="text-muted-foreground">
                                                                → {slot.scheduleEnd}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">No slots</span>
                                            )}
                                        </td>

                                        <td className="px-3 py-3">
                                            {s.isActive === false ? "Inactive" : "Active"}
                                        </td>
                                    </tr>
                                );
                            })}

                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                                        No assigned students found.
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