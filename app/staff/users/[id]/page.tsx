"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type User = {
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

function fullName(u?: Partial<User>) {
    if (!u) return "—";
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return name || u.username || u.email || "—";
}

function formatValue(value?: string | null) {
    if (!value) return "—";
    return value;
}

export default function StaffUserProfilePage() {
    const params = useParams<{ id: string }>();
    const userId = params.id;

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);

            const res = await fetch(`/api/staff/users/${userId}`, {
                cache: "no-store",
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to load user profile");
                setLoading(false);
                return;
            }

            setUser(data);
            setLoading(false);
        }

        void load();
    }, [userId]);

    const backHref = useMemo(() => {
        if (user?.role === "TUTOR") return "/staff/tutors";
        if (user?.role === "STUDENT") return "/staff/students";
        return "/staff";
    }, [user]);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">
                        {loading ? "User Profile" : `${user?.role ?? "User"} Profile`}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Admin view for tutor and student account details.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button asChild variant="secondary">
                        <Link href={backHref}>Back</Link>
                    </Button>

                    <Button asChild variant="secondary">
                        <Link href="/staff/allocate">Go Allocate</Link>
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>{loading ? "Loading..." : fullName(user ?? undefined)}</CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading profile...</p>
                    ) : !user ? (
                        <p className="text-sm text-muted-foreground">User not found.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Role</div>
                                <div className="mt-1 font-medium">{user.role ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Status</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {user.isLocked ? (
                                        <Badge variant="destructive">Locked</Badge>
                                    ) : (
                                        <Badge>Unlocked</Badge>
                                    )}

                                    {user.isActive === false ? (
                                        <Badge variant="secondary">Inactive</Badge>
                                    ) : (
                                        <Badge>Active</Badge>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Username</div>
                                <div className="mt-1 font-medium">{user.username ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Email</div>
                                <div className="mt-1 font-medium">{user.email ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">First Name</div>
                                <div className="mt-1 font-medium">{user.firstName ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Last Name</div>
                                <div className="mt-1 font-medium">{user.lastName ?? "—"}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Created Date</div>
                                <div className="mt-1 font-medium">{formatValue(user.createdDate)}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4">
                                <div className="text-sm text-muted-foreground">Updated Date</div>
                                <div className="mt-1 font-medium">{formatValue(user.updatedDate)}</div>
                            </div>

                            <div className="rounded-lg border bg-slate-50 p-4 md:col-span-2">
                                <div className="text-sm text-muted-foreground">Last Login</div>
                                <div className="mt-1 font-medium">{formatValue(user.lastLoginDate)}</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}