"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
    Home,
    GraduationCap,
    Users,
    CalendarDays,
    Upload,
    Shuffle,
    BookOpen,
    LogOut,
    ArrowLeft,
    UserCircle2,
} from "lucide-react";

const navItems = [
    { href: "/staff", label: "Home", icon: Home },
    { href: "/staff/tutors", label: "Tutor List", icon: GraduationCap },
    { href: "/staff/students", label: "Student List", icon: Users },
    { href: "/staff/meetings", label: "Schedule Meeting", icon: CalendarDays },
    { href: "/staff/files", label: "Uploaded Files", icon: Upload },
    { href: "/staff/allocate", label: "Allocate/ Reallocate", icon: Shuffle },
    { href: "/staff/blogs", label: "Blogs", icon: BookOpen },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [search, setSearch] = useState("");

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.push("/login");
        router.refresh();
    }

    return (
        <div className="min-h-screen w-full bg-slate-200">
            <div className="w-full">
                <div className="grid min-h-screen grid-cols-1 md:grid-cols-[280px_1fr]">
                    {/* Sidebar */}
                    <aside className="bg-slate-800 text-white p-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-xl font-bold">Edu Link</div>
                            <button
                                className="rounded-full p-2 hover:bg-white/10"
                                aria-label="Back"
                                title="Back"
                                onClick={() => router.back()}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-2 mb-6">
                            <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
                                <UserCircle2 className="h-10 w-10 text-white/80" />
                            </div>
                            <div className="text-sm opacity-90">Admin Staff 1</div>
                        </div>

                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const active = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={[
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                                            active ? "bg-white/15" : "hover:bg-white/10",
                                        ].join(" ")}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="mt-6">
                            <Button variant="secondary" className="w-full justify-start gap-2" onClick={logout}>
                                <LogOut className="h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    </aside>

                    {/* Main */}
                    <section className="bg-slate-100">
                        <div className="flex items-center justify-between gap-3 p-4 border-b bg-white">
                            <div className="text-sm text-muted-foreground">Staff Dashboard</div>
                            <div className="w-full max-w-xl">
                                <Input
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <main className="p-4">{children}</main>
                    </section>
                </div>
            </div>
        </div>
    );
}