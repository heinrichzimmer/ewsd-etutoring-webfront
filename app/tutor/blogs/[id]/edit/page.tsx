"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type Student = {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
};

type Attachment = {
    id: string;
    fileName: string;
};

type BlogEditData = {
    id: string;
    body: string;
    allStudents: boolean;
    targetStudentIds: string[];
    attachments: Attachment[];
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

function normalizeAttachment(raw: any): Attachment | null {
    if (!raw || typeof raw !== "object") return null;
    const id = raw.id ?? raw.attachmentId;
    if (typeof id !== "string") return null;

    return {
        id,
        fileName: raw.fileName ?? raw.originalFileName ?? raw.name ?? "Attachment",
    };
}

function normalizeBlog(raw: any): BlogEditData | null {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;

    const attachments = (Array.isArray(raw.attachments) ? raw.attachments : [])
        .map(normalizeAttachment)
        .filter((x: Attachment | null): x is Attachment => x !== null);

    const targetStudentIds = Array.isArray(raw.targetStudentIds)
        ? raw.targetStudentIds
        : Array.isArray(raw.targetStudents)
            ? raw.targetStudents
                .map((x: any) => (typeof x === "string" ? x : x?.id))
                .filter((x: any): x is string => typeof x === "string")
            : [];

    const allStudents =
        raw.allStudents === true ||
        raw.visibleToAll === true ||
        raw.isForAllStudents === true ||
        targetStudentIds.length === 0;

    return {
        id: raw.id,
        body: raw.body ?? raw.content ?? "",
        allStudents,
        targetStudentIds,
        attachments,
    };
}

export default function TutorEditBlogPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const blogId = params.id;

    const [loading, setLoading] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [students, setStudents] = useState<Student[]>([]);
    const [body, setBody] = useState("");
    const [audience, setAudience] = useState<"all" | "specific">("all");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [keepAttachmentIds, setKeepAttachmentIds] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);

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

    async function loadBlog() {
        setLoading(true);

        const res = await fetch(`/api/tutor/blogs/${blogId}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load blog");
            setLoading(false);
            return;
        }

        const blog = normalizeBlog(data);
        if (!blog) {
            toast.error("Invalid blog data.");
            setLoading(false);
            return;
        }

        setBody(blog.body);
        setAudience(blog.allStudents ? "all" : "specific");
        setSelectedStudentIds(blog.targetStudentIds);
        setExistingAttachments(blog.attachments);
        setKeepAttachmentIds(blog.attachments.map((x) => x.id));
        setLoading(false);
    }

    useEffect(() => {
        if (!blogId) return;
        loadStudents();
        loadBlog();
    }, [blogId]);

    function toggleStudent(studentId: string, checked: boolean) {
        setSelectedStudentIds((prev) =>
            checked ? [...prev, studentId] : prev.filter((id) => id !== studentId)
        );
    }

    function toggleKeepAttachment(attachmentId: string, checked: boolean) {
        setKeepAttachmentIds((prev) =>
            checked ? [...prev, attachmentId] : prev.filter((id) => id !== attachmentId)
        );
    }

    function onFileChange(e: ChangeEvent<HTMLInputElement>) {
        setNewFiles(Array.from(e.target.files ?? []));
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

            keepAttachmentIds.forEach((id) => {
                formData.append("keepAttachmentIds", id);
            });

            newFiles.forEach((file) => {
                formData.append("attachments", file);
            });

            const res = await fetch(`/api/tutor/blogs/${blogId}`, {
                method: "PUT",
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to update blog");
                return;
            }

            toast.success("Blog updated successfully.");
            router.push(`/tutor/blogs/${blogId}`);
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    }

    const keptCount = useMemo(() => keepAttachmentIds.length, [keepAttachmentIds]);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Edit Blog</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Update blog content, audience, and attachments.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button asChild variant="secondary">
                        <a href={`/tutor/blogs/${blogId}`}>Back</a>
                    </Button>
                </div>
            </div>

            {loading ? (
                <Card className="shadow-sm">
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Loading blog...
                    </CardContent>
                </Card>
            ) : (
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Update Blog Post</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Blog Content</label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Write your blog update here..."
                                    className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
                                        <div className="mb-3 text-sm font-medium">Select students</div>

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

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium">Existing Attachments</label>
                                    <Badge variant="secondary">{keptCount} kept</Badge>
                                </div>

                                {existingAttachments.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No existing attachments.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {existingAttachments.map((attachment) => (
                                            <label
                                                key={attachment.id}
                                                className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={keepAttachmentIds.includes(attachment.id)}
                                                        onCheckedChange={(checked) =>
                                                            toggleKeepAttachment(attachment.id, Boolean(checked))
                                                        }
                                                    />
                                                    <div className="text-sm">{attachment.fileName}</div>
                                                </div>

                                                <a
                                                    href={`/api/blogs/attachments/${attachment.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-blue-600 underline"
                                                >
                                                    Download
                                                </a>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Add New Attachments</label>
                                <Input type="file" multiple onChange={onFileChange} />
                                {newFiles.length > 0 && (
                                    <div className="rounded-md border bg-slate-50 p-3 text-sm">
                                        <div className="mb-2 font-medium">New files</div>
                                        <ul className="space-y-1 text-muted-foreground">
                                            {newFiles.map((file, index) => (
                                                <li key={`${file.name}-${index}`}>{file.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? "Saving..." : "Save Changes"}
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => router.push(`/tutor/blogs/${blogId}`)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}