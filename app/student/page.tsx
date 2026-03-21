"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, MessageSquare, UserRound } from "lucide-react";

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
    lastLoginDate?: string | null;
};

type Meeting = {
    id: string;
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
    tutorUserId?: string;
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

function normalizeAllocatedTutor(raw: unknown): UserLite | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    const tutor =
        (obj.tutor as Record<string, unknown> | undefined) ??
        (obj.tutorUser as Record<string, unknown> | undefined) ??
        obj;

    if (typeof tutor.id !== "string") return null;

    return {
        id: tutor.id,
        firstName: typeof tutor.firstName === "string" ? tutor.firstName : "",
        lastName: typeof tutor.lastName === "string" ? tutor.lastName : "",
        username: typeof tutor.username === "string" ? tutor.username : "",
        email: typeof tutor.email === "string" ? tutor.email : "",
        lastLoginDate: typeof tutor.lastLoginDate === "string" ? tutor.lastLoginDate : null,
    };
}

function normalizeMeeting(raw: unknown): Meeting | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    return {
        id: obj.id,
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
        tutorUserId:
            typeof obj.tutorUserId === "string"
                ? obj.tutorUserId
                : typeof obj.tutorId === "string"
                    ? obj.tutorId
                    : undefined,
        lastMessageAt:
            typeof obj.lastMessageAt === "string"
                ? obj.lastMessageAt
                : typeof obj.updatedAt === "string"
                    ? obj.updatedAt
                    : null,
    };
}

export default function StudentDashboardPage() {
    const [me, setMe] = useState<Me | null>(null);
    const [tutors, setTutors] = useState<UserLite[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);

            const [meRes, tutorsRes, meetingsRes, blogsRes, convRes] = await Promise.all([
                fetch("/api/me"),
                fetch("/api/student/allocated-tutors"),
                fetch("/api/student/meetings?page=0&size=20"),
                fetch("/api/student/blogs"),
                fetch("/api/conversations?page=0&size=20"),
            ]);

            const [meData, tutorsData, meetingsData, blogsData, convData] = await Promise.all([
                meRes.json().catch(() => ({})),
                tutorsRes.json().catch(() => ({})),
                meetingsRes.json().catch(() => ({})),
                blogsRes.json().catch(() => ({})),
                convRes.json().catch(() => ({})),
            ]);

            if (meRes.ok) setMe(meData);

            if (tutorsRes.ok) {
                const raw: unknown[] = Array.isArray(tutorsData) ? tutorsData : tutorsData?.content ?? [];
                setTutors(raw.map(normalizeAllocatedTutor).filter((x): x is UserLite => x !== null));
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

    const tutorMap = useMemo(() => {
        const map = new Map<string, UserLite>();
        tutors.forEach((tutor) => map.set(tutor.id, tutor));
        return map;
    }, [tutors]);

    const tutor = tutors[0] ?? null;

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

    const latestBlogs = useMemo(() => {
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
                            <Link href="/student/messages">Open Messages</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/student/meetings">My Meetings</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="shadow-sm">
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="rounded-full bg-slate-100 p-3">
                            <UserRound className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-semibold">{tutor ? 1 : 0}</div>
                            <div className="text-sm text-muted-foreground">My Tutor</div>
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
                            <div className="text-sm text-muted-foreground">Visible Blogs</div>
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

            <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                <div className="space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">My Tutor</CardTitle>
                            <Button asChild size="sm" variant="secondary">
                                <Link href="/student/tutor">View</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Loading tutor...</div>
                            ) : tutor ? (
                                <div className="space-y-2">
                                    <div className="font-medium">{fullName(tutor)}</div>
                                    <div className="text-sm text-muted-foreground">{tutor.email ?? "-"}</div>
                                    {tutor.lastLoginDate ? (
                                        <div className="text-xs text-muted-foreground">
                                            Last login: {formatDate(tutor.lastLoginDate)}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">Tutor information not available.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Upcoming Meetings</CardTitle>
                            <Button asChild size="sm" variant="secondary">
                                <Link href="/student/meetings">View All</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Loading meetings...</div>
                            ) : upcomingMeetings.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No upcoming meetings.</div>
                            ) : (
                                upcomingMeetings.map((meeting) => (
                                    <div key={meeting.id} className="rounded-lg border bg-slate-50 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="font-medium">{formatDate(meeting.startDate)}</div>
                                            {meeting.mode ? <Badge variant="outline">{meeting.mode}</Badge> : null}
                                        </div>
                                        {meeting.description ? (
                                            <div className="mt-2 text-sm">{truncate(meeting.description)}</div>
                                        ) : null}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Latest Blogs</CardTitle>
                            <Button asChild size="sm" variant="secondary">
                                <Link href="/student/blogs">View All</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Loading blogs...</div>
                            ) : latestBlogs.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No blogs available.</div>
                            ) : (
                                latestBlogs.map((blog) => (
                                    <div key={blog.id} className="rounded-lg border bg-slate-50 p-3">
                                        <div className="text-sm">{truncate(blog.body, 100)}</div>
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <div className="text-xs text-muted-foreground">
                                                {formatDate(blog.createdAt)}
                                            </div>
                                            <Button asChild size="sm" variant="secondary">
                                                <Link href={`/student/blogs/${blog.id}`}>Open</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Recent Messages</CardTitle>
                            <Button asChild size="sm" variant="secondary">
                                <Link href="/student/messages">Open Chat</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Loading messages...</div>
                            ) : recentMessages.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No conversations yet.</div>
                            ) : (
                                recentMessages.map((conversation) => {
                                    const tutorItem = conversation.tutorUserId
                                        ? tutorMap.get(conversation.tutorUserId)
                                        : undefined;

                                    return (
                                        <div key={conversation.id} className="rounded-lg border bg-slate-50 p-3">
                                            <div className="font-medium">{tutorItem ? fullName(tutorItem) : "My Tutor"}</div>
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
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button asChild variant="secondary">
                        <Link href="/student/tutor">Tutor Information</Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/student/meetings">Meetings</Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/student/messages">Messages</Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/student/blogs">Blogs</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}