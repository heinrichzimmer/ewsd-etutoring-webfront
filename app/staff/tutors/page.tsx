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

function fullName(u: User) {
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return name || u.username || "—";
}

export default function TutorListPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [tutors, setTutors] = useState<User[]>([]);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/staff/tutors", { cache: "no-store" });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data?.message ?? "Failed to load tutors");

            const list = Array.isArray(data) ? data : data?.content ?? [];
            setTutors(list);
        } catch (e: any) {
            setError(e?.message ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return tutors;

        return tutors.filter((t) => {
            const text = `${fullName(t)} ${t.username ?? ""} ${t.email ?? ""}`.toLowerCase();
            return text.includes(q);
        });
    }, [tutors, query]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-semibold">Tutor List</h1>

                <div className="flex items-center gap-2">
                    <Input
                        className="w-65"
                        placeholder="Search tutor..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Badge variant="outline">{filtered.length} tutors</Badge>
                    <Button asChild variant="secondary">
                        <Link href="/staff/allocate">Go Allocate</Link>
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Tutors</CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <div className="rounded-lg border bg-white overflow-auto">
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
                                    {filtered.map((t, idx) => (
                                        <TableRow key={t.id}>
                                            <TableCell>{idx + 1}</TableCell>
                                            <TableCell className="font-medium">{fullName(t)}</TableCell>
                                            <TableCell>{t.username ?? "-"}</TableCell>
                                            <TableCell>{t.email}</TableCell>
                                            <TableCell>
                                                {t.isLocked ? (
                                                    <Badge variant="destructive">Locked</Badge>
                                                ) : t.isActive === false ? (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                ) : (
                                                    <Badge>Active</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild size="sm" variant="secondary">
                                                    <Link href={`/staff/users/${t.id}`}>View</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                No tutors found.
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