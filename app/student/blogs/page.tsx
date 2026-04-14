"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Attachment = {
    id: string;
    fileName: string;
};

type Blog = {
    id: string;
    body: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    attachments: Attachment[];
    commentsCount: number;
};

const ITEMS_PER_PAGE = 5;

function normalizeAttachment(raw: any): Attachment | null {
    if (!raw || typeof raw !== "object") return null;
    const id = raw.id ?? raw.attachmentId;
    if (typeof id !== "string") return null;

    return {
        id,
        fileName: raw.fileName ?? raw.originalFileName ?? raw.name ?? "Attachment",
    };
}

function normalizeBlog(raw: any): Blog | null {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;

    const attachments = (Array.isArray(raw.attachments) ? raw.attachments : [])
        .map(normalizeAttachment)
        .filter((x: Attachment | null): x is Attachment => x !== null);

    const commentsCount =
        Array.isArray(raw.comments)
            ? raw.comments.length
            : typeof raw.commentsCount === "number"
                ? raw.commentsCount
                : typeof raw.commentCount === "number"
                    ? raw.commentCount
                    : 0;

    return {
        id: raw.id,
        body: raw.body ?? raw.content ?? "",
        createdAt: raw.createdAt ?? raw.createdDate ?? null,
        updatedAt: raw.updatedAt ?? raw.updatedDate ?? null,
        attachments,
        commentsCount,
    };
}

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

export default function StudentBlogsPage() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    async function loadBlogs() {
        setLoading(true);

        const res = await fetch("/api/student/blogs");
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
        void loadBlogs();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [query]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return blogs;
        return blogs.filter((blog) => blog.body.toLowerCase().includes(q));
    }, [blogs, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedBlogs = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Blogs</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Blog posts shared with you by your tutor.
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    className="w-full sm:max-w-sm"
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
                <>
                    <div className="space-y-4">
                        {paginatedBlogs.map((blog) => (
                            <Card key={blog.id} className="shadow-sm">
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {blog.attachments.length > 0 && (
                                            <Badge variant="secondary">
                                                {blog.attachments.length} attachment{blog.attachments.length === 1 ? "" : "s"}
                                            </Badge>
                                        )}
                                        <Badge variant="secondary">
                                            {blog.commentsCount} comment{blog.commentsCount === 1 ? "" : "s"}
                                        </Badge>
                                    </div>

                                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                                        {blog.body.length > 220 ? `${blog.body.slice(0, 220)}...` : blog.body}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="text-xs text-muted-foreground">
                                            Created: {formatDate(blog.createdAt)}
                                            {blog.updatedAt ? ` • Updated: ${formatDate(blog.updatedAt)}` : ""}
                                        </div>

                                        <Button asChild size="sm" variant="secondary">
                                            <Link href={`/student/blogs/${blog.id}`}>View</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

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
                </>
            )}
        </div>
    );
}