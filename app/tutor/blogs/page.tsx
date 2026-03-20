"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Blog = {
    id: string;
    body: string;
    createdAt?: string | null;
    createdDate?: string | null;
    updatedAt?: string | null;
    updatedDate?: string | null;
    attachmentsCount: number;
    commentsCount: number;
    audienceLabel: string;
};

function normalizeBlog(raw: any): Blog | null {
    if (!raw || typeof raw !== "object") return null;
    if (typeof raw.id !== "string") return null;

    const attachments =
        Array.isArray(raw.attachments) ? raw.attachments.length :
            typeof raw.attachmentsCount === "number" ? raw.attachmentsCount :
                typeof raw.attachmentCount === "number" ? raw.attachmentCount :
                    0;

    const comments =
        Array.isArray(raw.comments) ? raw.comments.length :
            typeof raw.commentsCount === "number" ? raw.commentsCount :
                typeof raw.commentCount === "number" ? raw.commentCount :
                    0;

    const targetStudentIds =
        Array.isArray(raw.targetStudentIds) ? raw.targetStudentIds :
            Array.isArray(raw.targetStudents) ? raw.targetStudents :
                [];

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
        attachmentsCount: attachments,
        commentsCount: comments,
        audienceLabel: allStudents ? "All students" : `${targetStudentIds.length} students`,
    };
}

function formatDate(value?: string | null) {
    if (!value) return "";
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

function truncate(text: string, max = 180) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function TutorBlogsPage() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);

    async function loadBlogs() {
        setLoading(true);

        const res = await fetch("/api/tutor/blogs");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load blogs");
            setLoading(false);
            return;
        }

        const rawList = Array.isArray(data) ? data : data?.content ?? [];
        const normalized = rawList
            .map(normalizeBlog)
            .filter((x: Blog | null): x is Blog => x !== null);

        setBlogs(normalized);
        setLoading(false);
    }

    useEffect(() => {
        loadBlogs();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return blogs;

        return blogs.filter((blog) => blog.body.toLowerCase().includes(q));
    }, [blogs, query]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Blogs</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create blog posts and share them with all or selected students.
                    </p>
                </div>

                <Button asChild>
                    <Link href="/tutor/blogs/create">Create Blog</Link>
                </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                    className="max-w-sm"
                    placeholder="Search blogs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="text-sm text-muted-foreground">
                    {filtered.length} blog{filtered.length === 1 ? "" : "s"}
                </div>
            </div>

            {loading ? (
                <Card className="shadow-sm">
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Loading blogs...
                    </CardContent>
                </Card>
            ) : filtered.length === 0 ? (
                <Card className="shadow-sm">
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        No blogs found.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filtered.map((blog) => (
                        <Card key={blog.id} className="shadow-sm">
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{blog.audienceLabel}</Badge>
                                    {blog.attachmentsCount > 0 && (
                                        <Badge variant="secondary">
                                            {blog.attachmentsCount} attachment{blog.attachmentsCount === 1 ? "" : "s"}
                                        </Badge>
                                    )}
                                    <Badge variant="secondary">
                                        {blog.commentsCount} comment{blog.commentsCount === 1 ? "" : "s"}
                                    </Badge>
                                </div>

                                <div className="text-sm leading-6 text-slate-800">
                                    {truncate(blog.body)}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                    <div>
                                        Created: {formatDate(blog.createdAt)}
                                        {blog.updatedAt && ` • Updated: ${formatDate(blog.updatedAt)}`}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button asChild size="sm" variant="secondary">
                                            <Link href={`/tutor/blogs/${blog.id}`}>View</Link>
                                        </Button>

                                        <Button asChild size="sm">
                                            <Link href={`/tutor/blogs/${blog.id}/edit`}>Edit</Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}