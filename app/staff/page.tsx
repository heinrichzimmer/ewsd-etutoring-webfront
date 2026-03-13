import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GraduationCap, Users, UserCheck, UserX, BookOpen } from "lucide-react";

export default function StaffDashboardPage() {
    return (
        <div className="space-y-4">
            {/* Top tabs like your mockup */}
            <div className="flex flex-wrap items-center gap-3">
                <Button asChild className="gap-2">
                    <Link href="/staff/tutors">
                        <GraduationCap className="h-4 w-4" />
                        Tutors
                    </Link>
                </Button>

                <Button asChild variant="secondary" className="gap-2">
                    <Link href="/staff/students">
                        <Users className="h-4 w-4" />
                        Students
                    </Link>
                </Button>

                <Button asChild variant="secondary" className="gap-2">
                    <Link href="/staff/allocate">
                        <UserCheck className="h-4 w-4" />
                        Assigned Students
                    </Link>
                </Button>

                <Button asChild variant="secondary" className="gap-2">
                    <Link href="/staff/allocate">
                        <UserX className="h-4 w-4" />
                        Unassigned Students
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                {/* Left: Tutor List table (simple mock) */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Tutor List</CardTitle>
                        <Badge variant="outline">Sprint 1</Badge>
                    </CardHeader>

                    <CardContent>
                        <div className="rounded-lg border bg-white overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                <tr className="border-b">
                                    <th className="px-3 py-2 text-left w-[60px]">No</th>
                                    <th className="px-3 py-2 text-left">Picture</th>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2 text-left">Last Seen</th>
                                    <th className="px-3 py-2 text-left">Action</th>
                                </tr>
                                </thead>

                                <tbody>
                                <tr className="border-b">
                                    <td className="px-3 py-2">1</td>
                                    <td className="px-3 py-2">🎓</td>
                                    <td className="px-3 py-2">Tutor 1</td>
                                    <td className="px-3 py-2">tutor1@gmail.com</td>
                                    <td className="px-3 py-2">02/02/2026</td>
                                    <td className="px-3 py-2">
                                        <Link className="text-blue-600 underline" href="/staff/tutors">
                                            View
                                        </Link>
                                    </td>
                                </tr>

                                <tr>
                                    <td className="px-3 py-2">2</td>
                                    <td className="px-3 py-2">🎓</td>
                                    <td className="px-3 py-2">Tutor 2</td>
                                    <td className="px-3 py-2">tutor2@gmail.com</td>
                                    <td className="px-3 py-2">01/02/2026</td>
                                    <td className="px-3 py-2">
                                        <Link className="text-blue-600 underline" href="/staff/tutors">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination mock */}
                        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <button className="px-2 py-1 rounded border bg-white hover:bg-slate-50">{"<"}</button>
                            <span className="px-2 py-1 rounded border bg-slate-900 text-white">1</span>
                            <span className="px-2 py-1 rounded border bg-white">2</span>
                            <span className="px-2 py-1 rounded border bg-white">3</span>
                            <button className="px-2 py-1 rounded border bg-white hover:bg-slate-50">{">"}</button>
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Latest Blogs */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Latest Blogs</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>

                    <CardContent className="space-y-3">
                        <div className="rounded-lg border p-3 bg-slate-50">
                            <div className="text-xs text-muted-foreground">03/03/2026</div>
                            <div className="font-medium">Xiao Fan</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                                Lorem ipsum is placeholder content for the blog preview...
                            </div>
                        </div>

                        <div className="rounded-lg border p-3 bg-slate-50">
                            <div className="text-xs text-muted-foreground">03/03/2026</div>
                            <div className="font-medium">Lu Xueqi</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                                Another example preview content for the latest blogs section...
                            </div>
                        </div>

                        <Button asChild variant="secondary" className="w-full">
                            <Link href="/staff/blogs">View All</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}