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
};

function fullName(u: User) {
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return name || u.username || "—";
}

export default function StudentListPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [students, setStudents] = useState<User[]>([]);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/staff/students");
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
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return students;
        return students.filter((s) => {
            const text = `${fullName(s)} ${s.username ?? ""} ${s.email ?? ""}`.toLowerCase();
            return text.includes(q);
        });
    }, [students, query]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-semibold">Student List</h1>

                <div className="flex items-center gap-2">
                    <Input
                        className="w-[260px]"
                        placeholder="Search student..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Badge variant="outline">{filtered.length} students</Badge>
                    <Button asChild variant="secondary">
                        <Link href="/staff/allocate">Go Allocate</Link>
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Students</CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <div className="rounded-lg border bg-white overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px]">No</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filtered.map((s, idx) => (
                                        <TableRow key={s.id}>
                                            <TableCell>{idx + 1}</TableCell>
                                            <TableCell className="font-medium">{fullName(s)}</TableCell>
                                            <TableCell>{s.username ?? "-"}</TableCell>
                                            <TableCell>{s.email}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="secondary" onClick={() => alert(`Student: ${fullName(s)}`)}>
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                No students found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}