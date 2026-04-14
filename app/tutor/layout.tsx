"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import {
    Home,
    Users,
    BookOpen,
    CalendarDays,
    Upload,
    LogOut,
    ArrowLeft,
    UserCircle2,
    MessageSquare,
    Menu,
    X,
} from "lucide-react";

const navItems = [
    { href: "/tutor", label: "Home", icon: Home },
    { href: "/tutor/students", label: "Assigned Students", icon: Users },
    { href: "/tutor/blogs", label: "Blogs", icon: BookOpen },
    { href: "/tutor/meetings", label: "Schedule Meeting", icon: CalendarDays },
    { href: "/tutor/files", label: "Uploaded Files", icon: Upload },
    { href: "/tutor/messages", label: "Messages", icon: MessageSquare },
];

export default function TutorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const currentLabel = useMemo(() => {
        const current = navItems.find(
            (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
        );
        return current?.label ?? "Tutor Dashboard";
    }, [pathname]);

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.push("/login");
        router.refresh();
    }

    const sidebarContent = (
        <>
            <div className="mb-6 flex items-center justify-between">
                <div className="text-2xl font-bold tracking-tight">Edu Link</div>

                <div className="flex items-center gap-1">
                    <button
                        className="hidden rounded-full p-2 transition hover:bg-white/10 md:inline-flex"
                        aria-label="Back"
                        title="Back"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>

                    <button
                        className="rounded-full p-2 transition hover:bg-white/10 md:hidden"
                        aria-label="Close menu"
                        title="Close menu"
                        onClick={() => setMobileOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="mb-8 flex flex-col items-center gap-2 rounded-2xl bg-white/5 px-4 py-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    <UserCircle2 className="h-10 w-10 text-white/80" />
                </div>
                <div className="text-sm font-medium opacity-90">Tutor</div>
                <div className="text-xs text-white/60">Teaching Portal</div>
            </div>

            <nav className="space-y-1">
                {navItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                                active
                                    ? "bg-white/15 font-medium text-white"
                                    : "text-white/85 hover:bg-white/10 hover:text-white",
                            ].join(" ")}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-8">
                <Button
                    variant="secondary"
                    className="w-full justify-start gap-2 rounded-xl"
                    onClick={logout}
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="md:grid md:min-h-screen md:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="hidden h-screen overflow-y-auto border-r border-white/10 bg-slate-800 p-4 text-white md:block">
                    {sidebarContent}
                </aside>

                {mobileOpen && (
                    <>
                        <button
                            className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
                            aria-label="Close menu overlay"
                            onClick={() => setMobileOpen(false)}
                        />

                        <aside className="fixed inset-y-0 left-0 z-50 w-[84vw] max-w-[320px] overflow-y-auto bg-slate-800 p-4 text-white shadow-2xl md:hidden">
                            {sidebarContent}
                        </aside>
                    </>
                )}

                <section className="min-w-0">
                    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
                        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setMobileOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>

                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-900">
                                    Tutor Dashboard
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                    {currentLabel}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="min-w-0 p-4 sm:p-6">{children}</main>
                </section>
            </div>
        </div>
    );
}