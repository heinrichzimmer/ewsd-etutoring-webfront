"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, MessageSquare, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Me = {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    lastLoginDate?: string | null;
};

type UserLite = {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
};

type Meeting = {
    id: string;
    studentUserId?: string;
    startDate?: string | null;
    endDate?: string | null;
    mode?: string;
    description?: string;
};

type Blog = {
    id: string;
    body: string;
    createdAt?: string | null;
};

type Conversation = {
    id: string;
    studentUserId?: string;
    lastMessageAt?: string | null;
};

function fullName(user?: Me | null) {
    if (!user) return "Unknown";
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || user.email || "Unknown";
}

function truncate(text: string, max = 90) {
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

function parseDate(value?: string | null) {
    if (!value) return null;

    const native = new Date(value);
    if (!Number.isNaN(native.getTime())) return native;

    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (match) {
        const [, dd, mm, yyyy, hh, min] = match;
        return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
    }

    return null;
}

function formatDate(value?: string | null) {
    const d = parseDate(value);
    if (!d) return value ?? "-";

    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function normalizeAllocatedStudent(raw: unknown): UserLite | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    const student = obj.student as Record<string, unknown> | undefined;
    if (!student || typeof student.id !== "string") return null;

    return {
        id: student.id,
        firstName: typeof student.firstName === "string" ? student.firstName : "",
        lastName: typeof student.lastName === "string" ? student.lastName : "",
        username: typeof student.username === "string" ? student.username : "",
        email: typeof student.email === "string" ? student.email : "",
    };
}

function normalizeMeeting(raw: unknown): Meeting | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    return {
        id: obj.id,
        studentUserId:
            typeof obj.studentUserId === "string"
                ? obj.studentUserId
                : typeof obj.studentId === "string"
                    ? obj.studentId
                    : undefined,
        startDate:
            typeof obj.startDate === "string"
                ? obj.startDate
                : typeof obj.startTime === "string"
                    ? obj.startTime
                    : typeof obj.meetingStart === "string"
                        ? obj.meetingStart
                        : undefined,
        endDate:
            typeof obj.endDate === "string"
                ? obj.endDate
                : typeof obj.endTime === "string"
                    ? obj.endTime
                    : typeof obj.meetingEnd === "string"
                        ? obj.meetingEnd
                        : undefined,
        mode: typeof obj.mode === "string" ? obj.mode : typeof obj.type === "string" ? obj.type : "",
        description:
            typeof obj.description === "string"
                ? obj.description
                : typeof obj.notes === "string"
                    ? obj.notes
                    : "",
    };
}

function normalizeBlog(raw: unknown): Blog | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

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
    };
}

function normalizeConversation(raw: unknown): Conversation | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    return {
        id: obj.id,
        studentUserId:
            typeof obj.studentUserId === "string"
                ? obj.studentUserId
                : typeof obj.studentId === "string"
                    ? obj.studentId
                    : undefined,
        lastMessageAt:
            typeof obj.lastMessageAt === "string"
                ? obj.lastMessageAt
                : typeof obj.updatedAt === "string"
                    ? obj.updatedAt
                    : null,
    };
}

export default function TutorDashboardPage() {
    const [me, setMe] = useState<Me | null>(null);
    const [students, setStudents] = useState<UserLite[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);

            const [meRes, studentsRes, meetingsRes, blogsRes, convRes] = await Promise.all([
                fetch("/api/me"),
                fetch("/api/tutor/allocated-students"),
                fetch("/api/tutor/meetings?page=0&size=20"),
                fetch("/api/tutor/blogs"),
                fetch("/api/conversations?page=0&size=20"),
            ]);

            const [meData, studentsData, meetingsData, blogsData, convData] = await Promise.all([
                meRes.json().catch(() => ({})),
                studentsRes.json().catch(() => ({})),
                meetingsRes.json().catch(() => ({})),
                blogsRes.json().catch(() => ({})),
                convRes.json().catch(() => ({})),
            ]);

            if (meRes.ok) setMe(meData);

            if (studentsRes.ok) {
                const raw: unknown[] = Array.isArray(studentsData) ? studentsData : studentsData?.content ?? [];
                setStudents(raw.map(normalizeAllocatedStudent).filter((x): x is UserLite => x !== null));
            }

            if (meetingsRes.ok) {
                const raw: unknown[] = Array.isArray(meetingsData) ? meetingsData : meetingsData?.content ?? [];
                setMeetings(raw.map(normalizeMeeting).filter((x): x is Meeting => x !== null));
            }

            if (blogsRes.ok) {
                const raw: unknown[] = Array.isArray(blogsData) ? blogsData : blogsData?.content ?? [];
                setBlogs(raw.map(normalizeBlog).filter((x): x is Blog => x !== null));
            }

            if (convRes.ok) {
                const raw: unknown[] = Array.isArray(convData) ? convData : convData?.content ?? [];
                setConversations(raw.map(normalizeConversation).filter((x): x is Conversation => x !== null));
            }

            setLoading(false);
        }

        void load();
    }, []);

    const studentMap = useMemo(() => {
        const map = new Map<string, UserLite>();
        students.forEach((student) => map.set(student.id, student));
        return map;
    }, [students]);

    const upcomingMeetings = useMemo(() => {
        const now = new Date().getTime();

        return meetings
            .filter((meeting) => {
                const time = parseDate(meeting.startDate)?.getTime();
                return typeof time === "number" && time >= now;
            })
            .sort((a, b) => {
                const aTime = parseDate(a.startDate)?.getTime() ?? 0;
                const bTime = parseDate(b.startDate)?.getTime() ?? 0;
                return aTime - bTime;
            })
            .slice(0, 3);
    }, [meetings]);

    const recentBlogs = useMemo(() => {
        return [...blogs]
            .sort((a, b) => {
                const aTime = parseDate(a.createdAt)?.getTime() ?? 0;
                const bTime = parseDate(b.createdAt)?.getTime() ?? 0;
                return bTime - aTime;
            })
            .slice(0, 3);
    }, [blogs]);

    const recentMessages = useMemo(() => {
        return [...conversations]
            .sort((a, b) => {
                const aTime = parseDate(a.lastMessageAt)?.getTime() ?? 0;
                const bTime = parseDate(b.lastMessageAt)?.getTime() ?? 0;
                return bTime - aTime;
            })
            .slice(0, 3);
    }, [conversations]);

    const greeting = me?.lastLoginDate
        ? `Welcome back, ${fullName(me)}`
        : `Welcome, ${fullName(me)}${me ? "!" : ""}`;

    const lastLoginText = me?.lastLoginDate
        ? `Last login: ${formatDate(me.lastLoginDate)}`
        : "This looks like your first login.";

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{greeting}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{lastLoginText}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <Link href="/tutor/meetings/create">Create Meeting</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/tutor/blogs/create">Create Blog</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="shadow-sm">
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="rounded-full bg-slate-100 p-3">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-semibold">{students.length}</div>
                            <div className="text-sm text-muted-foreground">Allocated Students</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="rounded-full bg-slate-100 p-3">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-semibold">{upcomingMeetings.length}</div>
                            <div className="text-sm text-muted-foreground">Upcoming Meetings</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="rounded-full bg-slate-100 p-3">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-semibold">{blogs.length}</div>
                            <div className="text-sm text-muted-foreground">Blogs Created</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="rounded-full bg-slate-100 p-3">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-semibold">{conversations.length}</div>
                            <div className="text-sm text-muted-foreground">Conversations</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Upcoming Meetings</CardTitle>
                        <Button asChild size="sm" variant="secondary">
                            <Link href="/tutor/meetings">View All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading ? (
                            <div className="text-sm text-muted-foreground">Loading meetings...</div>
                        ) : upcomingMeetings.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No upcoming meetings.</div>
                        ) : (
                            upcomingMeetings.map((meeting) => {
                                const student = meeting.studentUserId ? studentMap.get(meeting.studentUserId) : undefined;

                                return (
                                    <div key={meeting.id} className="rounded-lg border bg-slate-50 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="font-medium">{student ? fullName(student) : "Student"}</div>
                                            {meeting.mode ? <Badge variant="outline">{meeting.mode}</Badge> : null}
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            {formatDate(meeting.startDate)}
                                        </div>
                                        {meeting.description ? (
                                            <div className="mt-2 text-sm">{truncate(meeting.description)}</div>
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Recent Messages</CardTitle>
                            <Button asChild size="sm" variant="secondary">
                                <Link href="/tutor/messages">Open Chat</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Loading messages...</div>
                            ) : recentMessages.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No conversations yet.</div>
                            ) : (
                                recentMessages.map((conversation) => {
                                    const student = conversation.studentUserId
                                        ? studentMap.get(conversation.studentUserId)
                                        : undefined;

                                    return (
                                        <div key={conversation.id} className="rounded-lg border bg-slate-50 p-3">
                                            <div className="font-medium">{student ? fullName(student) : "Student"}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {conversation.lastMessageAt
                                                    ? `Last activity: ${formatDate(conversation.lastMessageAt)}`
                                                    : "No activity yet"}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Latest Blogs</CardTitle>
                            <Button asChild size="sm" variant="secondary">
                                <Link href="/tutor/blogs">View All</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Loading blogs...</div>
                            ) : recentBlogs.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No blogs yet.</div>
                            ) : (
                                recentBlogs.map((blog) => (
                                    <div key={blog.id} className="rounded-lg border bg-slate-50 p-3">
                                        <div className="text-sm">{truncate(blog.body, 100)}</div>
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <div className="text-xs text-muted-foreground">
                                                {formatDate(blog.createdAt)}
                                            </div>
                                            <Button asChild size="sm" variant="secondary">
                                                <Link href={`/tutor/blogs/${blog.id}`}>Open</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button asChild variant="secondary">
                        <Link href="/tutor/students">Assigned Students</Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/tutor/meetings">Schedule Meeting</Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/tutor/messages">Messages</Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/tutor/blogs">Blogs</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}