"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type User = {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
    isActive?: boolean;
    isLocked?: boolean;
};

const ITEMS_PER_PAGE = 5;

function fullName(u: User) {
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return name || u.username || "—";
}

export default function StudentListPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [students, setStudents] = useState<User[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    async function load() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/staff/students", { cache: "no-store" });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data?.message ?? "Failed to load students");

            const list = Array.isArray(data) ? data : data?.content ?? [];
            setStudents(list);
        } catch (e: any) {
            setError(e?.message ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [query]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return students;

        return students.filter((s) => {
            const text = `${fullName(s)} ${s.username ?? ""} ${s.email ?? ""}`.toLowerCase();
            return text.includes(q);
        });
    }, [students, query]);

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
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <h1 className="text-xl font-semibold">Student List</h1>

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
                    <Button asChild variant="secondary" className="w-full sm:w-auto">
                        <Link href="/staff/allocate">Go Allocate</Link>
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Students</CardTitle>
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
                                            <TableHead className="w-15">No</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {paginatedItems.map((s, idx) => {
                                            const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

                                            return (
                                                <TableRow key={s.id}>
                                                    <TableCell>{rowNumber}</TableCell>
                                                    <TableCell className="font-medium">{fullName(s)}</TableCell>
                                                    <TableCell>{s.username ?? "-"}</TableCell>
                                                    <TableCell>{s.email}</TableCell>
                                                    <TableCell>
                                                        {s.isLocked ? (
                                                            <Badge variant="destructive">Locked</Badge>
                                                        ) : s.isActive === false ? (
                                                            <Badge variant="secondary">Inactive</Badge>
                                                        ) : (
                                                            <Badge>Active</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button asChild size="sm" variant="secondary">
                                                            <Link href={`/staff/users/${s.id}`}>View</Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}

                                        {paginatedItems.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                                    No students found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="grid gap-3 md:hidden">
                                {paginatedItems.length === 0 ? (
                                    <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                                        No students found.
                                    </div>
                                ) : (
                                    paginatedItems.map((s, idx) => {
                                        const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

                                        return (
                                            <div key={s.id} className="rounded-xl border bg-white p-4 shadow-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-xs text-muted-foreground">#{rowNumber}</div>
                                                        <div className="truncate font-medium">{fullName(s)}</div>
                                                        <div className="truncate text-sm text-muted-foreground">{s.email}</div>
                                                    </div>

                                                    {s.isLocked ? (
                                                        <Badge variant="destructive">Locked</Badge>
                                                    ) : s.isActive === false ? (
                                                        <Badge variant="secondary">Inactive</Badge>
                                                    ) : (
                                                        <Badge>Active</Badge>
                                                    )}
                                                </div>

                                                <div className="mt-3 space-y-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Username: </span>
                                                        <span>{s.username ?? "-"}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
                                                        <Link href={`/staff/users/${s.id}`}>View</Link>
                                                    </Button>
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
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}