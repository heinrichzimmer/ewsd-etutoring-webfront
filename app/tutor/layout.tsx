"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
} from "lucide-react";

const navItems = [
    { href: "/tutor", label: "Home", icon: Home },
    { href: "/tutor/students", label: "Assigned Students", icon: Users },
    { href: "/tutor/blogs", label: "Blogs", icon: BookOpen },
    { href: "/tutor/meetings", label: "Schedule Meeting", icon: CalendarDays },
    { href: "/tutor/files", label: "Uploaded Files", icon: Upload },
];

export default function TutorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.push("/login");
        router.refresh();
    }

    return (
        <div className="min-h-screen w-full bg-slate-200">
            <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
                <aside className="bg-slate-800 text-white p-4">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="text-2xl font-bold">Edu Link</div>
                        <button
                            className="rounded-full p-2 hover:bg-white/10"
                            aria-label="Back"
                            title="Back"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mb-8 flex flex-col items-center gap-2">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                            <UserCircle2 className="h-10 w-10 text-white/80" />
                        </div>
                        <div className="text-sm opacity-90">Tutor</div>
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

                    <div className="mt-8">
                        <Button variant="secondary" className="w-full justify-start gap-2" onClick={logout}>
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </aside>

                <section className="bg-slate-100">
                    <div className="border-b bg-white px-4 py-4">
                        <div className="text-sm text-muted-foreground">Tutor Dashboard</div>
                    </div>

                    <main className="p-4">{children}</main>
                </section>
            </div>
        </div>
    );
}