"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
    lastLoginDate?: string | null;
};

function fullName(u?: Tutor | null) {
    if (!u) return "Unknown Tutor";
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username || "Unknown Tutor";
}

function normalizeTutor(raw: any): Tutor | null {
    if (!raw || typeof raw !== "object") return null;

    if (raw.tutor && typeof raw.tutor === "object") {
        return normalizeTutor(raw.tutor);
    }

    if (raw.tutorUser && typeof raw.tutorUser === "object") {
        return normalizeTutor(raw.tutorUser);
    }

    if (typeof raw.id === "string") {
        return {
            id: raw.id,
            username: raw.username ?? "",
            firstName: raw.firstName ?? "",
            lastName: raw.lastName ?? "",
            email: raw.email ?? "",
            role: raw.role,
            isActive: raw.isActive,
            isLocked: raw.isLocked,
            lastLoginDate: raw.lastLoginDate ?? null,
        };
    }

    return null;
}

export default function StudentTutorPage() {
    const [tutors, setTutors] = useState<Tutor[]>([]);

    async function load() {
        const res = await fetch("/api/student/allocated-tutors");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load allocated tutors");
            return;
        }

        const list = Array.isArray(data) ? data : data?.content ?? [];
        const normalized = list
            .map(normalizeTutor)
            .filter((x): x is Tutor => x !== null);

        setTutors(normalized);
    }

    useEffect(() => {
        load();
    }, []);

    const tutor = useMemo(() => tutors[0] ?? null, [tutors]);

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Tutor Information</h1>

            <Card className="max-w-3xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">My Tutor</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {tutor ? (
                        <>
                            <div>
                                <div className="text-sm font-medium">Name</div>
                                <div className="text-sm text-muted-foreground">{fullName(tutor)}</div>
                            </div>

                            <div>
                                <div className="text-sm font-medium">Username</div>
                                <div className="text-sm text-muted-foreground">{tutor.username ?? "-"}</div>
                            </div>

                            <div>
                                <div className="text-sm font-medium">Email</div>
                                <div className="text-sm text-muted-foreground">{tutor.email ?? "-"}</div>
                            </div>

                            <div>
                                <div className="text-sm font-medium">Status</div>
                                <div className="text-sm text-muted-foreground">
                                    {tutor.isActive === false ? "Inactive" : "Active"}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium">Last Login</div>
                                <div className="text-sm text-muted-foreground">{tutor.lastLoginDate ?? "-"}</div>
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            Tutor information is not available yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}