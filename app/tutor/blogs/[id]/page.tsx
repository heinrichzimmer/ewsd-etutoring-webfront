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
    authorUserId?: string;
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

type Me = {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
};

type UserLite = {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
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

function fullName(u?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
}) {
    if (!u) return "Unknown";
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username || u.email || "Unknown";
}

function normalizeAttachment(raw: unknown): Attachment | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    const id = typeof obj.id === "string" ? obj.id : typeof obj.attachmentId === "string" ? obj.attachmentId : null;
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

function normalizeComment(raw: unknown): Comment | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    const nestedAuthor =
        (obj.author as Record<string, unknown> | undefined) ??
        (obj.user as Record<string, unknown> | undefined) ??
        (obj.createdBy as Record<string, unknown> | undefined) ??
        undefined;

    const nestedAuthorName = nestedAuthor
        ? `${typeof nestedAuthor.firstName === "string" ? nestedAuthor.firstName : ""} ${
            typeof nestedAuthor.lastName === "string" ? nestedAuthor.lastName : ""
        }`.trim() ||
        (typeof nestedAuthor.username === "string" ? nestedAuthor.username : "") ||
        (typeof nestedAuthor.email === "string" ? nestedAuthor.email : "")
        : undefined;

    const authorUserId =
        typeof obj.authorUserId === "string"
            ? obj.authorUserId
            : typeof obj.userId === "string"
                ? obj.userId
                : typeof obj.createdById === "string"
                    ? obj.createdById
                    : nestedAuthor && typeof nestedAuthor.id === "string"
                        ? nestedAuthor.id
                        : undefined;

    return {
        id: obj.id,
        comment:
            typeof obj.comment === "string"
                ? obj.comment
                : typeof obj.body === "string"
                    ? obj.body
                    : typeof obj.content === "string"
                        ? obj.content
                        : "",
        createdAt:
            typeof obj.createdAt === "string"
                ? obj.createdAt
                : typeof obj.createdDate === "string"
                    ? obj.createdDate
                    : null,
        authorName:
            typeof obj.authorName === "string"
                ? obj.authorName
                : typeof obj.createdByName === "string"
                    ? obj.createdByName
                    : typeof obj.userName === "string"
                        ? obj.userName
                        : nestedAuthorName,
        authorUserId,
    };
}

function normalizeBlog(raw: unknown): BlogDetail | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    const attachmentsRaw = Array.isArray(obj.attachments) ? obj.attachments : [];
    const commentsRaw = Array.isArray(obj.comments) ? obj.comments : [];

    const targetStudentIds = Array.isArray(obj.targetStudentIds)
        ? obj.targetStudentIds
        : Array.isArray(obj.targetStudents)
            ? obj.targetStudents
            : [];

    const allStudents =
        obj.allStudents === true ||
        obj.visibleToAll === true ||
        obj.isForAllStudents === true ||
        targetStudentIds.length === 0;

    return {
        id: obj.id,
        body:
            typeof obj.body === "string"
                ? obj.body
                : typeof obj.content === "string"
                    ? obj.content
                    : "",
        createdAt:
            typeof obj.createdAt === "string"
                ? obj.createdAt
                : typeof obj.createdDate === "string"
                    ? obj.createdDate
                    : null,
        updatedAt:
            typeof obj.updatedAt === "string"
                ? obj.updatedAt
                : typeof obj.updatedDate === "string"
                    ? obj.updatedDate
                    : null,
        attachments: attachmentsRaw
            .map(normalizeAttachment)
            .filter((x): x is Attachment => x !== null),
        comments: commentsRaw
            .map(normalizeComment)
            .filter((x): x is Comment => x !== null),
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

    const [me, setMe] = useState<Me | null>(null);
    const [userMap, setUserMap] = useState<Record<string, UserLite>>({});

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

    async function loadCommentUsers() {
        const [meRes, studentsRes] = await Promise.all([
            fetch("/api/me"),
            fetch("/api/tutor/allocated-students"),
        ]);

        const meData = await meRes.json().catch(() => ({}));
        const studentsData = await studentsRes.json().catch(() => ({}));

        const nextMap: Record<string, UserLite> = {};

        if (meRes.ok && meData?.id) {
            const currentMe = meData as Me;
            setMe(currentMe);
            nextMap[currentMe.id] = currentMe;
        }

        const rawStudents: unknown[] = Array.isArray(studentsData) ? studentsData : studentsData?.content ?? [];

        rawStudents.forEach((item) => {
            if (!item || typeof item !== "object") return;

            const obj = item as Record<string, unknown>;
            const student = obj.student as Record<string, unknown> | undefined;
            if (!student || typeof student.id !== "string") return;

            nextMap[student.id] = {
                id: student.id,
                username: typeof student.username === "string" ? student.username : "",
                firstName: typeof student.firstName === "string" ? student.firstName : "",
                lastName: typeof student.lastName === "string" ? student.lastName : "",
                email: typeof student.email === "string" ? student.email : "",
            };
        });

        setUserMap(nextMap);
    }

    useEffect(() => {
        if (!blogId) return;
        void loadBlog();
        void loadCommentUsers();
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
        if (!canEditComment(comment)) {
            toast.error("You can only edit your own comments.");
            return;
        }

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

    function resolveCommentAuthor(comment: Comment) {
        if (comment.authorName) return comment.authorName;
        if (comment.authorUserId && userMap[comment.authorUserId]) {
            return fullName(userMap[comment.authorUserId]);
        }
        return "Unknown";
    }

    function canEditComment(comment: Comment) {
        if (!me) return false;

        if (comment.authorUserId) {
            return comment.authorUserId === me.id;
        }

        const resolvedAuthor = resolveCommentAuthor(comment).trim().toLowerCase();
        const myFullName = fullName(me).trim().toLowerCase();
        const myUsername = (me.username ?? "").trim().toLowerCase();
        const myEmail = (me.email ?? "").trim().toLowerCase();

        return (
            resolvedAuthor === myFullName ||
            resolvedAuthor === myUsername ||
            resolvedAuthor === myEmail
        );
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
                                                {resolveCommentAuthor(comment)} • {formatDate(comment.createdAt)}
                                            </div>

                                            {editingCommentId === comment.id && canEditComment(comment) ? (
                                                <div className="space-y-3">
                                                    <Input
                                                        value={editingCommentText}
                                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                                        placeholder="Edit comment..."
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => void saveEdit(comment.id)}
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
                                                    {canEditComment(comment) && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => startEdit(comment)}
                                                        >
                                                            Edit Comment
                                                        </Button>
                                                    )}
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