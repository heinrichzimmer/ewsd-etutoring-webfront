"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Attachment = {
    id: string;
    fileName: string;
};

type Assignment = {
    id: string;
    title: string;
    instructions: string;
    dueDate?: string | null;
    attachments: Attachment[];
};

function normalizeAttachment(raw: unknown): Attachment | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    const id =
        typeof obj.id === "string"
            ? obj.id
            : typeof obj.attachmentId === "string"
                ? obj.attachmentId
                : null;

    if (!id) return null;

    return {
        id,
        fileName:
            typeof obj.fileName === "string"
                ? obj.fileName
                : typeof obj.originalFileName === "string"
                    ? obj.originalFileName
                    : typeof obj.name === "string"
                        ? obj.name
                        : "Attachment",
    };
}

function normalizeAssignment(raw: unknown): Assignment | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    const attachmentsRaw = Array.isArray(obj.attachments) ? obj.attachments : [];

    return {
        id: obj.id,
        title:
            typeof obj.title === "string"
                ? obj.title
                : "Untitled Assignment",
        instructions:
            typeof obj.instructions === "string"
                ? obj.instructions
                : typeof obj.description === "string"
                    ? obj.description
                    : "",
        dueDate:
            typeof obj.dueDate === "string"
                ? obj.dueDate
                : typeof obj.deadline === "string"
                    ? obj.deadline
                    : null,
        attachments: attachmentsRaw
            .map(normalizeAttachment)
            .filter((x): x is Attachment => x !== null),
    };
}

export default function TutorFilesPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);

            const res = await fetch("/api/tutor/assignments");
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to load assignments");
                setLoading(false);
                return;
            }

            const rawList: unknown[] = Array.isArray(data) ? data : data?.content ?? [];
            const normalized = rawList
                .map(normalizeAssignment)
                .filter((x): x is Assignment => x !== null);

            setAssignments(normalized);
            setLoading(false);
        }

        void load();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return assignments;

        return assignments.filter(
            (assignment) =>
                assignment.title.toLowerCase().includes(q) ||
                assignment.instructions.toLowerCase().includes(q)
        );
    }, [assignments, search]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Assignments</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage assignments and review student submissions.
                    </p>
                </div>

                <Button asChild>
                    <Link href="/tutor/files/create">Create Assignment</Link>
                </Button>
            </div>

            <Input
                placeholder="Search assignments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
            />

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Assignment List</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                    {loading ? (
                        <div className="text-sm text-muted-foreground">Loading assignments...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No assignments found.</div>
                    ) : (
                        filtered.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="rounded-lg border bg-slate-50 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="font-medium">{assignment.title}</div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            Due: {assignment.dueDate ?? "-"}
                                        </div>
                                    </div>

                                    <Button asChild size="sm" variant="secondary">
                                        <Link href={`/tutor/files/${assignment.id}`}>Open</Link>
                                    </Button>
                                </div>

                                {assignment.instructions ? (
                                    <div className="mt-3 text-sm line-clamp-2">
                                        {assignment.instructions}
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}