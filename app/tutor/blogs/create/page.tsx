"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type Student = {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
};

type AllocatedStudentItem = {
    student?: Student;
};

function fullName(u?: Student) {
    if (!u) return "Unknown Student";
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username || "Unknown Student";
}

function normalizeAllocatedStudent(raw: any): Student | null {
    const s = raw?.student ?? raw;
    if (!s || typeof s !== "object" || typeof s.id !== "string") return null;

    return {
        id: s.id,
        firstName: s.firstName ?? "",
        lastName: s.lastName ?? "",
        username: s.username ?? "",
        email: s.email ?? "",
    };
}

export default function TutorCreateBlogPage() {
    const router = useRouter();

    const [loadingStudents, setLoadingStudents] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [students, setStudents] = useState<Student[]>([]);
    const [body, setBody] = useState("");
    const [audience, setAudience] = useState<"all" | "specific">("all");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);

    async function loadStudents() {
        setLoadingStudents(true);

        const res = await fetch("/api/tutor/allocated-students");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load allocated students");
            setLoadingStudents(false);
            return;
        }

        const rawList = Array.isArray(data) ? data : data?.content ?? [];
        const normalized = rawList
            .map(normalizeAllocatedStudent)
            .filter((x: Student | null): x is Student => x !== null);

        setStudents(normalized);
        setLoadingStudents(false);
    }

    useEffect(() => {
        loadStudents();
    }, []);

    function onFileChange(e: ChangeEvent<HTMLInputElement>) {
        const list = Array.from(e.target.files ?? []);
        setFiles(list);
    }

    function toggleStudent(studentId: string, checked: boolean) {
        setSelectedStudentIds((prev) =>
            checked ? [...prev, studentId] : prev.filter((id) => id !== studentId)
        );
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault();

        if (!body.trim()) {
            toast.error("Please write your blog content.");
            return;
        }

        if (audience === "specific" && selectedStudentIds.length === 0) {
            toast.error("Please select at least one student.");
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("body", body.trim());

            if (audience === "specific") {
                selectedStudentIds.forEach((id) => {
                    formData.append("targetStudentIds", id);
                });
            }

            files.forEach((file) => {
                formData.append("attachments", file);
            });

            const res = await fetch("/api/tutor/blogs", {
                method: "POST",
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to create blog");
                return;
            }

            toast.success("Blog created successfully.");
            router.push("/tutor/blogs");
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    }

    const selectedCount = useMemo(() => selectedStudentIds.length, [selectedStudentIds]);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Create Blog</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Write a blog post for all allocated students or only selected students.
                </p>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">New Blog Post</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Blog Content</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Write your blog update here..."
                                className="min-h-45 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Who can see this blog?</label>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAudience("all")}
                                    className={`rounded-md border px-4 py-2 text-sm ${
                                        audience === "all"
                                            ? "border-slate-900 bg-slate-900 text-white"
                                            : "bg-white text-slate-900"
                                    }`}
                                >
                                    All allocated students
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAudience("specific")}
                                    className={`rounded-md border px-4 py-2 text-sm ${
                                        audience === "specific"
                                            ? "border-slate-900 bg-slate-900 text-white"
                                            : "bg-white text-slate-900"
                                    }`}
                                >
                                    Specific students
                                </button>
                            </div>

                            {audience === "specific" && (
                                <div className="rounded-lg border bg-slate-50 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="text-sm font-medium">Select students</div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedCount} selected
                                        </div>
                                    </div>

                                    {loadingStudents ? (
                                        <div className="text-sm text-muted-foreground">Loading students...</div>
                                    ) : students.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">
                                            No allocated students found.
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {students.map((student) => (
                                                <label
                                                    key={student.id}
                                                    className="flex items-start gap-3 rounded-md border bg-white p-3"
                                                >
                                                    <Checkbox
                                                        checked={selectedStudentIds.includes(student.id)}
                                                        onCheckedChange={(checked) =>
                                                            toggleStudent(student.id, Boolean(checked))
                                                        }
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="font-medium">{fullName(student)}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {student.email ?? "-"}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Attachments</label>
                            <Input type="file" multiple onChange={onFileChange} />
                            {files.length > 0 && (
                                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                                    <div className="mb-2 font-medium">Selected files</div>
                                    <ul className="space-y-1 text-muted-foreground">
                                        {files.map((file, index) => (
                                            <li key={`${file.name}-${index}`}>
                                                {file.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Publishing..." : "Publish Blog"}
                            </Button>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.push("/tutor/blogs")}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}