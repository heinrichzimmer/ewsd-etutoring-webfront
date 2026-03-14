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
    lastLoginDate?: string | null;
};

function fullName(u: Student) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;
}

export default function TutorStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [query, setQuery] = useState("");

    async function load() {
        const res = await fetch("/api/tutor/allocated-students");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load allocated students");
            return;
        }

        setStudents(Array.isArray(data) ? data : data?.content ?? []);
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
                <h1 className="text-xl font-semibold">Assigned Students</h1>

                <div className="flex items-center gap-2">
                    <Input
                        className="w-[260px]"
                        placeholder="Search student..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Badge variant="outline">{filtered.length} students</Badge>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Allocated Students</CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="rounded-lg border bg-white overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                            <tr className="border-b">
                                <th className="px-3 py-2 text-left w-[60px]">No</th>
                                <th className="px-3 py-2 text-left">Name</th>
                                <th className="px-3 py-2 text-left">Username</th>
                                <th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left">Status</th>
                            </tr>
                            </thead>

                            <tbody>
                            {filtered.map((s, idx) => (
                                <tr key={s.id} className="border-b">
                                    <td className="px-3 py-2">{idx + 1}</td>
                                    <td className="px-3 py-2 font-medium">{fullName(s)}</td>
                                    <td className="px-3 py-2">{s.username}</td>
                                    <td className="px-3 py-2">{s.email}</td>
                                    <td className="px-3 py-2">
                                        {s.isActive === false ? "Inactive" : "Active"}
                                    </td>
                                </tr>
                            ))}

                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
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