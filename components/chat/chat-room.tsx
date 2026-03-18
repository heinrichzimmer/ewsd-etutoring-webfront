"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Me = {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
};

type Conversation = {
    id: string;
    tutorUserId?: string;
    studentUserId?: string;
    lastMessageAt?: string | null;
    unreadCount?: number;
};

type Message = {
    id: string;
    body?: string;
    content?: string;
    senderUserId?: string;
    createdDate?: string;
    createdAt?: string;
};

type UserLite = {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
};

function fullName(u?: {
    firstName?: string;
    lastName?: string;
    username?: string;
}) {
    if (!u) return "Unknown";
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username || "Unknown";
}

function formatTime(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function normalizeAllocatedStudent(raw: any): UserLite | null {
    const s = raw?.student;
    if (!s || typeof s.id !== "string") return null;

    return {
        id: s.id,
        firstName: s.firstName ?? "",
        lastName: s.lastName ?? "",
        username: s.username ?? "",
        email: s.email ?? "",
    };
}

function normalizeAllocatedTutor(raw: any): UserLite | null {
    const t = raw?.tutor ?? raw?.tutorUser ?? raw;
    if (!t || typeof t.id !== "string") return null;

    return {
        id: t.id,
        firstName: t.firstName ?? "",
        lastName: t.lastName ?? "",
        username: t.username ?? "",
        email: t.email ?? "",
    };
}

export default function ChatRoom({ isTutor }: { isTutor: boolean }) {
    const [me, setMe] = useState<Me | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState("");
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [allocatedStudents, setAllocatedStudents] = useState<UserLite[]>([]);
    const [allocatedTutors, setAllocatedTutors] = useState<UserLite[]>([]);
    const [userMap, setUserMap] = useState<Record<string, UserLite>>({});

    async function loadMe(silent = false) {
        const res = await fetch("/api/me");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            if (!silent) toast.error(data?.message ?? "Failed to load current user");
            return null;
        }

        setMe(data);
        setUserMap((prev) => ({
            ...prev,
            [data.id]: data,
        }));
        return data as Me;
    }

    async function loadSidebarData(currentMe?: Me | null, silent = false) {
        const convRes = await fetch("/api/conversations?page=0&size=20");
        const convData = await convRes.json().catch(() => ({}));

        if (!convRes.ok) {
            if (!silent) toast.error(convData?.message ?? "Failed to load conversations");
            return;
        }

        const convList: Conversation[] = Array.isArray(convData) ? convData : convData?.content ?? [];
        setConversations(convList);

        const meValue = currentMe ?? me;
        if (meValue?.id) {
            setUserMap((prev) => ({
                ...prev,
                [meValue.id]: meValue,
            }));
        }

        if (isTutor) {
            const stuRes = await fetch("/api/tutor/allocated-students");
            const stuData = await stuRes.json().catch(() => ({}));

            if (!stuRes.ok) {
                if (!silent) toast.error(stuData?.message ?? "Failed to load allocated students");
                return;
            }

            const students = (Array.isArray(stuData) ? stuData : stuData?.content ?? [])
                .map(normalizeAllocatedStudent)
                .filter((x): x is UserLite => x !== null);

            setAllocatedStudents(students);

            setUserMap((prev) => {
                const next = { ...prev };
                students.forEach((s) => {
                    next[s.id] = s;
                });
                return next;
            });

            return;
        }

        const tutorRes = await fetch("/api/student/allocated-tutors");
        const tutorData = await tutorRes.json().catch(() => ({}));

        if (!tutorRes.ok) {
            if (!silent) toast.error(tutorData?.message ?? "Failed to load allocated tutors");
            return;
        }

        const tutors = (Array.isArray(tutorData) ? tutorData : tutorData?.content ?? [])
            .map(normalizeAllocatedTutor)
            .filter((x): x is UserLite => x !== null);

        setAllocatedTutors(tutors);

        setUserMap((prev) => {
            const next = { ...prev };
            tutors.forEach((t) => {
                next[t.id] = t;
            });
            return next;
        });
    }

    async function loadMessages(conversationId: string, silent = false) {
        if (!conversationId) return;

        setLoadingMessages(true);

        const res = await fetch(`/api/conversations/${conversationId}/messages?page=0&size=50`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            if (!silent) toast.error(data?.message ?? "Failed to load messages");
            setLoadingMessages(false);
            return;
        }

        const list: Message[] = Array.isArray(data) ? data : data?.content ?? [];
        setMessages(list);
        setLoadingMessages(false);

        await fetch(`/api/conversations/${conversationId}/read`, {
            method: "PATCH",
        }).catch(() => {});
    }

    async function createConversationForTutor(studentUserId: string) {
        if (!me?.id) {
            toast.error("Current tutor profile is not loaded yet.");
            return;
        }

        const existing = conversations.find((c) => c.studentUserId === studentUserId);
        if (existing) {
            setSelectedConversationId(existing.id);
            await loadMessages(existing.id);
            return;
        }

        const res = await fetch("/api/conversations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tutorUserId: me.id,
                studentUserId,
            }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to create conversation");
            return;
        }

        await loadSidebarData(undefined, true);

        if (data?.id) {
            setSelectedConversationId(data.id);
            await loadMessages(data.id);
        }
    }

    async function createConversationForStudent(tutorUserId: string) {
        if (!me?.id) {
            toast.error("Current student profile is not loaded yet.");
            return;
        }

        const existing = conversations.find((c) => c.tutorUserId === tutorUserId);
        if (existing) {
            setSelectedConversationId(existing.id);
            await loadMessages(existing.id);
            return;
        }

        const res = await fetch("/api/conversations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tutorUserId,
                studentUserId: me.id,
            }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to create conversation");
            return;
        }

        await loadSidebarData(undefined, true);

        if (data?.id) {
            setSelectedConversationId(data.id);
            await loadMessages(data.id);
        }
    }

    async function sendMessage() {
        if (!selectedConversationId || !draft.trim()) return;

        const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ body: draft.trim() }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to send message");
            return;
        }

        setDraft("");
        await loadMessages(selectedConversationId, true);
        await loadSidebarData(undefined, true);
    }

    useEffect(() => {
        (async () => {
            const currentMe = await loadMe();
            await loadSidebarData(currentMe);
        })();
    }, []);

    useEffect(() => {
        if (!selectedConversationId) return;
        loadMessages(selectedConversationId, true);
    }, [selectedConversationId]);

    useEffect(() => {
        const timer = setInterval(() => {
            loadSidebarData(undefined, true);
            if (selectedConversationId) {
                loadMessages(selectedConversationId, true);
            }
        }, 5000);

        return () => clearInterval(timer);
    }, [selectedConversationId, me?.id, isTutor]);

    const sortedMessages = useMemo(() => {
        return [...messages].sort((a, b) => {
            const da = new Date(a.createdDate || a.createdAt || 0).getTime();
            const db = new Date(b.createdDate || b.createdAt || 0).getTime();
            return da - db;
        });
    }, [messages]);

    const conversationTitle = (c: Conversation) => {
        if (isTutor) {
            const student = userMap[c.studentUserId ?? ""];
            return student ? fullName(student) : "Student";
        }

        const tutor = userMap[c.tutorUserId ?? ""];
        return tutor ? fullName(tutor) : "My Tutor";
    };

    const conversationSubtitle = (c: Conversation) => {
        if (isTutor) {
            const student = userMap[c.studentUserId ?? ""];
            return student?.email ?? (c.lastMessageAt ? formatTime(c.lastMessageAt) : "");
        }

        const tutor = userMap[c.tutorUserId ?? ""];
        return tutor?.email ?? (c.lastMessageAt ? formatTime(c.lastMessageAt) : "Tutor conversation");
    };

    return (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
            <div className="rounded-xl border bg-white">
                <div className="border-b px-4 py-3 font-medium">
                    {isTutor ? "Students" : "Tutors"}
                </div>

                <div className="max-h-162.5 overflow-auto">
                    {isTutor ? (
                        allocatedStudents.length > 0 ? (
                            allocatedStudents.map((student) => {
                                const existing = conversations.find((c) => c.studentUserId === student.id);

                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => {
                                            if (existing) {
                                                setSelectedConversationId(existing.id);
                                            } else {
                                                createConversationForTutor(student.id);
                                            }
                                        }}
                                        className={`flex w-full flex-col border-b px-4 py-3 text-left hover:bg-slate-50 ${
                                            existing?.id === selectedConversationId ? "bg-slate-50" : ""
                                        }`}
                                    >
                                        <span className="font-medium">{fullName(student)}</span>
                                        <span className="text-xs text-muted-foreground">{student.email}</span>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-4 text-sm text-muted-foreground">No allocated students.</div>
                        )
                    ) : allocatedTutors.length > 0 ? (
                        allocatedTutors.map((tutor) => {
                            const existing = conversations.find((c) => c.tutorUserId === tutor.id);

                            return (
                                <button
                                    key={tutor.id}
                                    onClick={() => {
                                        if (existing) {
                                            setSelectedConversationId(existing.id);
                                        } else {
                                            createConversationForStudent(tutor.id);
                                        }
                                    }}
                                    className={`flex w-full flex-col border-b px-4 py-3 text-left hover:bg-slate-50 ${
                                        existing?.id === selectedConversationId ? "bg-slate-50" : ""
                                    }`}
                                >
                                    <span className="font-medium">{fullName(tutor)}</span>
                                    <span className="text-xs text-muted-foreground">{tutor.email}</span>
                                </button>
                            );
                        })
                    ) : conversations.length > 0 ? (
                        conversations.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedConversationId(c.id)}
                                className={`flex w-full flex-col border-b px-4 py-3 text-left hover:bg-slate-50 ${
                                    selectedConversationId === c.id ? "bg-slate-50" : ""
                                }`}
                            >
                                <span className="font-medium">{conversationTitle(c)}</span>
                                <span className="text-xs text-muted-foreground">
                  {conversationSubtitle(c)}
                </span>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground">No tutor conversation yet.</div>
                    )}
                </div>
            </div>

            <div className="flex min-h-162.5 flex-col rounded-xl border bg-white">
                <div className="border-b px-4 py-3 font-medium">Chat</div>

                <div className="flex-1 space-y-3 overflow-auto p-4">
                    {!selectedConversationId ? (
                        <div className="text-sm text-muted-foreground">
                            {isTutor ? "Select a student to start chatting." : "Select your tutor to start chatting."}
                        </div>
                    ) : loadingMessages ? (
                        <div className="text-sm text-muted-foreground">Loading messages...</div>
                    ) : sortedMessages.length > 0 ? (
                        sortedMessages.map((m) => {
                            const senderId = m.senderUserId;
                            const mine = Boolean(senderId && me?.id && senderId === me.id);
                            const sender = senderId ? userMap[senderId] : undefined;

                            return (
                                <div
                                    key={m.id}
                                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                                            mine
                                                ? "bg-slate-900 text-white"
                                                : "border bg-slate-50 text-slate-900"
                                        }`}
                                    >
                                        <div className="mb-1 text-[11px] opacity-70">
                                            {mine ? "You" : sender ? fullName(sender) : isTutor ? "Student" : "Tutor"}
                                        </div>
                                        <div className="text-sm">{m.body || m.content || ""}</div>
                                        <div className="mt-1 text-[11px] opacity-70">
                                            {formatTime(m.createdDate || m.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-sm text-muted-foreground">No messages yet.</div>
                    )}
                </div>

                <div className="flex gap-2 border-t p-4">
                    <Input
                        placeholder="Type your message..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        disabled={!selectedConversationId}
                    />
                    <Button onClick={sendMessage} disabled={!selectedConversationId || !draft.trim()}>
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
}