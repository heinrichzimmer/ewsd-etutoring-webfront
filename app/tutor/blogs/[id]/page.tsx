"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Attachment = {
    id: string;
    fileName: string;
};

type Comment = {
    id: string;
    comment: string;
    createdAt?: string | null;
    authorName?: string;
};

type BlogDetail = {
    id: string;
    body: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    attachments: Attachment[];
    comments: Comment[];
    audienceLabel: string;
};

function formatDate(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
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

function normalizeComment(raw: any): Comment | null {
    if (!raw || typeof raw !== "object") return null;
    if (typeof raw.id !== "string") return null;

    return {
        id: raw.id,
        comment: raw.comment ?? raw.body ?? raw.content ?? "",
        createdAt: raw.createdAt ?? raw.createdDate ?? null,
        authorName:
            raw.authorName ??
            raw.createdByName ??
            raw.userName ??
            raw.author?.username ??
            "Unknown",
    };
}

function normalizeBlog(raw: any): BlogDetail | null {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;

    const attachments = (Array.isArray(raw.attachments) ? raw.attachments : [])
        .map(normalizeAttachment)
        .filter((x: Attachment | null): x is Attachment => x !== null);

    const comments = (Array.isArray(raw.comments) ? raw.comments : [])
        .map(normalizeComment)
        .filter((x: Comment | null): x is Comment => x !== null);

    const targetStudentIds = Array.isArray(raw.targetStudentIds)
        ? raw.targetStudentIds
        : Array.isArray(raw.targetStudents)
            ? raw.targetStudents
            : [];

    const allStudents =
        raw.allStudents === true ||
        raw.visibleToAll === true ||
        raw.isForAllStudents === true ||
        targetStudentIds.length === 0;

    return {
        id: raw.id,
        body: raw.body ?? raw.content ?? "",
        createdAt: raw.createdAt ?? raw.createdDate ?? null,
        updatedAt: raw.updatedAt ?? raw.updatedDate ?? null,
        attachments,
        comments,
        audienceLabel: allStudents ? "All students" : `${targetStudentIds.length} students`,
    };
}

export default function TutorBlogDetailPage() {
    const params = useParams<{ id: string }>();
    const blogId = params.id;

    const [loading, setLoading] = useState(true);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    const [blog, setBlog] = useState<BlogDetail | null>(null);
    const [commentText, setCommentText] = useState("");

    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");

    async function loadBlog() {
        setLoading(true);

        const res = await fetch(`/api/tutor/blogs/${blogId}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load blog");
            setLoading(false);
            return;
        }

        setBlog(normalizeBlog(data));
        setLoading(false);
    }

    useEffect(() => {
        if (blogId) loadBlog();
    }, [blogId]);

    async function onSubmitComment(e: FormEvent) {
        e.preventDefault();

        if (!commentText.trim()) {
            toast.error("Please write a comment.");
            return;
        }

        setSubmittingComment(true);

        try {
            const res = await fetch(`/api/tutor/blogs/${blogId}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment: commentText.trim(),
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to post comment");
                return;
            }

            setCommentText("");
            toast.success("Comment posted.");
            await loadBlog();
        } finally {
            setSubmittingComment(false);
        }
    }

    function startEdit(comment: Comment) {
        setEditingCommentId(comment.id);
        setEditingCommentText(comment.comment);
    }

    function cancelEdit() {
        setEditingCommentId(null);
        setEditingCommentText("");
    }

    async function saveEdit(commentId: string) {
        if (!editingCommentText.trim()) {
            toast.error("Please write a comment.");
            return;
        }

        setSavingEdit(true);

        try {
            const res = await fetch(`/api/tutor/blogs/comments/${commentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment: editingCommentText.trim(),
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to update comment");
                return;
            }

            toast.success("Comment updated.");
            cancelEdit();
            await loadBlog();
        } finally {
            setSavingEdit(false);
        }
    }

    const attachmentCount = useMemo(() => blog?.attachments.length ?? 0, [blog]);
    const commentCount = useMemo(() => blog?.comments.length ?? 0, [blog]);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Blog Detail</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View full blog content, attachments, and comments.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button asChild variant="secondary">
                        <Link href="/tutor/blogs">Back</Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/tutor/blogs/${blogId}/edit`}>Edit Blog</Link>
                    </Button>
                </div>
            </div>

            {loading ? (
                <Card className="shadow-sm">
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Loading blog...
                    </CardContent>
                </Card>
            ) : !blog ? (
                <Card className="shadow-sm">
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Blog not found.
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card className="shadow-sm">
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{blog.audienceLabel}</Badge>
                                <Badge variant="secondary">
                                    {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"}
                                </Badge>
                                <Badge variant="secondary">
                                    {commentCount} comment{commentCount === 1 ? "" : "s"}
                                </Badge>
                            </div>
                            <CardTitle className="text-lg">Blog Content</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                                {blog.body || "-"}
                            </div>

                            <div className="text-xs text-muted-foreground">
                                Created: {formatDate(blog.createdAt)}
                                {blog.updatedAt ? ` • Updated: ${formatDate(blog.updatedAt)}` : ""}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Attachments</CardTitle>
                        </CardHeader>

                        <CardContent>
                            {blog.attachments.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No attachments.</div>
                            ) : (
                                <div className="space-y-2">
                                    {blog.attachments.map((attachment) => (
                                        <div
                                            key={attachment.id}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2"
                                        >
                                            <div className="text-sm">{attachment.fileName}</div>
                                            <Button asChild size="sm" variant="secondary">
                                                <a
                                                    href={`/api/blogs/attachments/${attachment.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Download
                                                </a>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Comments</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <form onSubmit={onSubmitComment} className="space-y-3">
                <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
                                <Button type="submit" disabled={submittingComment}>
                                    {submittingComment ? "Posting..." : "Post Comment"}
                                </Button>
                            </form>

                            <div className="space-y-3">
                                {blog.comments.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No comments yet.</div>
                                ) : (
                                    blog.comments.map((comment) => (
                                        <div key={comment.id} className="rounded-md border bg-slate-50 p-3 space-y-3">
                                            <div className="text-xs text-muted-foreground">
                                                {comment.authorName} • {formatDate(comment.createdAt)}
                                            </div>

                                            {editingCommentId === comment.id ? (
                                                <div className="space-y-3">
                                                    <Input
                                                        value={editingCommentText}
                                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                                        placeholder="Edit comment..."
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => saveEdit(comment.id)}
                                                            disabled={savingEdit}
                                                        >
                                                            {savingEdit ? "Saving..." : "Save"}
                                                        </Button>
                                                        <Button size="sm" variant="secondary" onClick={cancelEdit}>
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-sm whitespace-pre-wrap">{comment.comment}</div>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => startEdit(comment)}
                                                    >
                                                        Edit Comment
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}