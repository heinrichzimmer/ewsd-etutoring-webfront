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

type AllocatedStudent = {
    student: {
        id: string;
        firstName: string;
        lastName: string;
        username: string;
        email: string;
    };
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

export default function ChatRoom({ isTutor }: { isTutor: boolean }) {
    const [me, setMe] = useState<Me | null>(null);
    const [allocatedStudents, setAllocatedStudents] = useState<AllocatedStudent[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState("");
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [userMap, setUserMap] = useState<Record<string, UserLite>>({});

    async function fetchUser(id: string) {
        if (!id || userMap[id]) return;

        const res = await fetch(`/api/users/${id}`);
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            setUserMap((prev) => ({
                ...prev,
                [id]: data,
            }));
        }
    }

    async function loadMe() {
        const res = await fetch("/api/me");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load current user");
            return null;
        }

        setMe(data);
        return data;
    }

    async function loadSidebarData(currentMe?: Me | null) {
        const convRes = await fetch("/api/conversations?page=0&size=20");
        const convData = await convRes.json().catch(() => ({}));

        if (!convRes.ok) {
            toast.error(convData?.message ?? "Failed to load conversations");
            return;
        }

        const convList = Array.isArray(convData) ? convData : convData?.content ?? [];
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
                toast.error(stuData?.message ?? "Failed to load allocated students");
                return;
            }

            const students = Array.isArray(stuData) ? stuData : [];
            setAllocatedStudents(students);

            students.forEach((item: AllocatedStudent) => {
                setUserMap((prev) => ({
                    ...prev,
                    [item.student.id]: item.student,
                }));
            });

            // ✅ tutor side already has all names it needs
            return;
        }

        // only student side still needs extra user lookups
        convList.forEach((c: Conversation) => {
            if (c.tutorUserId) fetchUser(c.tutorUserId);
            if (c.studentUserId) fetchUser(c.studentUserId);
        });
    }

    async function loadMessages(conversationId: string) {
        if (!conversationId) return;

        setLoadingMessages(true);

        const res = await fetch(`/api/conversations/${conversationId}/messages?page=0&size=50`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load messages");
            setLoadingMessages(false);
            return;
        }

        const list = Array.isArray(data) ? data : data?.content ?? [];
        setMessages(list);
        setLoadingMessages(false);

        await fetch(`/api/conversations/${conversationId}/read`, {
            method: "PATCH",
        }).catch(() => {});
    }

    async function createConversation(studentUserId: string) {
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

        await loadSidebarData();

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
        await loadMessages(selectedConversationId);
        await loadSidebarData();
    }

    useEffect(() => {
        (async () => {
            const currentMe = await loadMe();
            await loadSidebarData(currentMe);
        })();
    }, []);

    useEffect(() => {
        if (!selectedConversationId) return;
        loadMessages(selectedConversationId);
    }, [selectedConversationId]);

    useEffect(() => {
        const timer = setInterval(() => {
            loadSidebarData();
            if (selectedConversationId) {
                loadMessages(selectedConversationId);
            }
        }, 5000);

        return () => clearInterval(timer);
    }, [selectedConversationId, me?.id, isTutor]);

    const conversationTitle = (c: Conversation) => {
        if (isTutor) {
            const student =
                userMap[c.studentUserId ?? ""] ||
                allocatedStudents.find((x) => x.student.id === c.studentUserId)?.student;

            return fullName(student);
        }

        const tutor = userMap[c.tutorUserId ?? ""];
        return fullName(tutor);
    };

    const conversationSubtitle = (c: Conversation) => {
        if (isTutor) {
            const student =
                userMap[c.studentUserId ?? ""] ||
                allocatedStudents.find((x) => x.student.id === c.studentUserId)?.student;

            return student?.email ?? "";
        }

        const tutor = userMap[c.tutorUserId ?? ""];
        return tutor?.email ?? "";
    };

    const sortedMessages = useMemo(() => {
        return [...messages].sort((a, b) => {
            const da = new Date(a.createdDate || a.createdAt || 0).getTime();
            const db = new Date(b.createdDate || b.createdAt || 0).getTime();
            return da - db;
        });
    }, [messages]);

    return (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
            <div className="rounded-xl border bg-white">
                <div className="border-b px-4 py-3 font-medium">
                    {isTutor ? "Students" : "Conversations"}
                </div>

                <div className="max-h-[650px] overflow-auto">
                    {isTutor ? (
                        allocatedStudents.length > 0 ? (
                            allocatedStudents.map((item) => {
                                const existing = conversations.find((c) => c.studentUserId === item.student.id);

                                return (
                                    <button
                                        key={item.student.id}
                                        onClick={() => {
                                            if (existing) {
                                                setSelectedConversationId(existing.id);
                                            } else {
                                                createConversation(item.student.id);
                                            }
                                        }}
                                        className={`flex w-full flex-col border-b px-4 py-3 text-left hover:bg-slate-50 ${
                                            existing?.id === selectedConversationId ? "bg-slate-50" : ""
                                        }`}
                                    >
                                        <span className="font-medium">{fullName(item.student)}</span>
                                        <span className="text-xs text-muted-foreground">{item.student.email}</span>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-4 text-sm text-muted-foreground">No allocated students.</div>
                        )
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
                  {conversationSubtitle(c) || (c.lastMessageAt ? formatTime(c.lastMessageAt) : "No messages yet")}
                </span>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
                    )}
                </div>
            </div>

            <div className="flex min-h-162.5 flex-col rounded-xl border bg-white">
                <div className="border-b px-4 py-3 font-medium">Chat</div>

                <div className="flex-1 space-y-3 overflow-auto p-4">
                    {!selectedConversationId ? (
                        <div className="text-sm text-muted-foreground">
                            {isTutor ? "Select a student to start chatting." : "Select a conversation."}
                        </div>
                    ) : loadingMessages ? (
                        <div className="text-sm text-muted-foreground">Loading messages...</div>
                    ) : sortedMessages.length > 0 ? (
                        sortedMessages.map((m) => {
                            const senderId = m.senderUserId;
                            const mine = senderId && me?.id ? senderId === me.id : false;
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
                                            {mine ? "You" : fullName(sender)}
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