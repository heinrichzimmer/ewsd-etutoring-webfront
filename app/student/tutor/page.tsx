"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tutor = {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    isLocked?: boolean;
    createdDate?: string | null;
    updatedDate?: string | null;
    lastLoginDate?: string | null;
};

function fullName(u?: Partial<Tutor>) {
    if (!u) return "—";
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return name || u.username || u.email || "—";
}

function formatValue(value?: string | null) {
    if (!value) return "—";
    return value;
}

function normalizeTutor(raw: unknown): Tutor | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    const nested =
        (obj.tutor as Record<string, unknown> | undefined) ??
        (obj.user as Record<string, unknown> | undefined) ??
        obj;

    if (typeof nested.id !== "string") return null;

    return {
        id: nested.id,
        username: typeof nested.username === "string" ? nested.username : undefined,
        firstName: typeof nested.firstName === "string" ? nested.firstName : undefined,
        lastName: typeof nested.lastName === "string" ? nested.lastName : undefined,
        email: typeof nested.email === "string" ? nested.email : undefined,
        role: typeof nested.role === "string" ? nested.role : undefined,
        isActive: typeof nested.isActive === "boolean" ? nested.isActive : undefined,
        isLocked: typeof nested.isLocked === "boolean" ? nested.isLocked : undefined,
        createdDate: typeof nested.createdDate === "string" ? nested.createdDate : null,
        updatedDate: typeof nested.updatedDate === "string" ? nested.updatedDate : null,
        lastLoginDate: typeof nested.lastLoginDate === "string" ? nested.lastLoginDate : null,
    };
}

export default function StudentTutorPage() {
    const [loading, setLoading] = useState(true);
    const [tutors, setTutors] = useState<Tutor[]>([]);

    useEffect(() => {
        async function load() {
            setLoading(true);

            const res = await fetch("/api/student/allocated-tutors", {
                cache: "no-store",
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to load tutor information");
                setLoading(false);
                return;
            }

            const rawList = Array.isArray(data) ? data : data?.content ?? [];
            const normalized = rawList
                .map(normalizeTutor)
                .filter((x: Tutor | null): x is Tutor => x !== null);

            setTutors(normalized);
            setLoading(false);
        }

        void load();
    }, []);

    const tutor = useMemo(() => tutors[0] ?? null, [tutors]);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Tutor Information</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View your currently allocated tutor details.
                    </p>
                </div>

                <Button asChild variant="secondary" className="w-full sm:w-auto">
                    <Link href="/student/messages">Go to Messages</Link>
                </Button>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>{loading ? "Loading..." : tutor ? fullName(tutor) : "My Tutor"}</CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading tutor information...</p>
                    ) : !tutor ? (
                        <p className="text-sm text-muted-foreground">
                            Tutor information is not available yet.
                        </p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Role</div>
                                <div className="mt-1 font-medium">{tutor.role ?? "TUTOR"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Status</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {tutor.isLocked ? (
                                        <Badge variant="destructive">Locked</Badge>
                                    ) : (
                                        <Badge>Unlocked</Badge>
                                    )}

                                    {tutor.isActive === false ? (
                                        <Badge variant="secondary">Inactive</Badge>
                                    ) : (
                                        <Badge>Active</Badge>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Username</div>
                                <div className="mt-1 font-medium">{tutor.username ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Email</div>
                                <div className="mt-1 font-medium break-words">{tutor.email ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">First Name</div>
                                <div className="mt-1 font-medium">{tutor.firstName ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Last Name</div>
                                <div className="mt-1 font-medium">{tutor.lastName ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Created Date</div>
                                <div className="mt-1 font-medium">{formatValue(tutor.createdDate)}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Updated Date</div>
                                <div className="mt-1 font-medium">{formatValue(tutor.updatedDate)}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4 md:col-span-2">
                                <div className="text-sm text-muted-foreground">Last Login</div>
                                <div className="mt-1 font-medium">{formatValue(tutor.lastLoginDate)}</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}