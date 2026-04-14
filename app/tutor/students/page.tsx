"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const ITEMS_PER_PAGE = 5;

function fullName(u: Student) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;
}

export default function TutorStudentsPage() {
    const [items, setItems] = useState<AllocatedStudent[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    async function load() {
        setLoading(true);

        const res = await fetch("/api/tutor/allocated-students");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load allocated students");
            setLoading(false);
            return;
        }

        setItems(Array.isArray(data) ? data : []);
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
        if (!q) return items;

        return items.filter((item) => {
            const s = item.student;
            const text = `${fullName(s)} ${s.username ?? ""} ${s.email ?? ""}`.toLowerCase();
            return text.includes(q);
        });
    }, [items, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold">Assigned Students</h1>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                        className="w-full sm:w-72"
                        placeholder="Search student..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Badge variant="outline" className="w-fit">
                        {filtered.length} students
                    </Badge>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Allocated Students</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="hidden overflow-auto rounded-lg border bg-white md:block">
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
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                                        Loading assigned students...
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                                        No assigned students found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item, idx) => {
                                    const s = item.student;
                                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

                                    return (
                                        <tr key={s.id} className="border-b align-top">
                                            <td className="px-3 py-3">{rowNumber}</td>

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
                                                                <div className="text-muted-foreground">→ {slot.scheduleEnd}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">No slots</span>
                                                )}
                                            </td>

                                            <td className="px-3 py-3">
                                                {s.isActive === false ? (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                ) : (
                                                    <Badge>Active</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-3 md:hidden">
                        {loading ? (
                            <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                Loading assigned students...
                            </div>
                        ) : paginatedItems.length === 0 ? (
                            <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                No assigned students found.
                            </div>
                        ) : (
                            paginatedItems.map((item, idx) => {
                                const s = item.student;
                                const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

                                return (
                                    <div key={s.id} className="rounded-xl border bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xs text-muted-foreground">#{rowNumber}</div>
                                                <div className="truncate font-medium">{fullName(s)}</div>
                                                <div className="truncate text-sm text-muted-foreground">{s.email}</div>
                                            </div>

                                            {s.isActive === false ? (
                                                <Badge variant="secondary">Inactive</Badge>
                                            ) : (
                                                <Badge>Active</Badge>
                                            )}
                                        </div>

                                        <div className="mt-3 space-y-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Username: </span>
                                                <span>{s.username}</span>
                                            </div>

                                            {s.lastLoginDate && (
                                                <div>
                                                    <span className="text-muted-foreground">Last login: </span>
                                                    <span>{s.lastLoginDate}</span>
                                                </div>
                                            )}

                                            <div>
                                                <div className="mb-2 text-muted-foreground">Allocation Slots:</div>
                                                {item.allocationSlots.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {item.allocationSlots.map((slot, slotIdx) => (
                                                            <div
                                                                key={slotIdx}
                                                                className="rounded-md border bg-slate-50 px-3 py-2 text-xs"
                                                            >
                                                                <div>{slot.scheduleStart}</div>
                                                                <div className="text-muted-foreground">→ {slot.scheduleEnd}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">No slots</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
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