"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function TutorCreateAssignmentPage() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [instructions, setInstructions] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);

    function onFileChange(e: ChangeEvent<HTMLInputElement>) {
        setFiles(Array.from(e.target.files ?? []));
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("Please enter assignment title.");
            return;
        }

        if (!instructions.trim()) {
            toast.error("Please enter assignment instructions.");
            return;
        }

        if (!dueDate.trim()) {
            toast.error("Please enter due date.");
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("instructions", instructions.trim());
            formData.append("dueDate", dueDate.trim());

            files.forEach((file) => {
                formData.append("attachments", file);
            });

            const res = await fetch("/api/tutor/assignments", {
                method: "POST",
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to create assignment");
                return;
            }

            toast.success("Assignment created successfully.");
            router.push("/tutor/files");
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Create Assignment</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create an assignment for your allocated students.
                    </p>
                </div>

                <Button variant="secondary" onClick={() => router.push("/tutor/files")}>
                    Back
                </Button>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">New Assignment</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Assignment Title"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Instructions</label>
                            <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="Write assignment instructions..."
                                className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Due Date</label>
                            <Input
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                placeholder="dd/MM/yyyy HH:mm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Example: 05/04/2026 23:59
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Attachments</label>
                            <Input type="file" multiple onChange={onFileChange} />

                            {files.length > 0 && (
                                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                                    <div className="mb-2 font-medium">Selected files</div>
                                    <ul className="space-y-1 text-muted-foreground">
                                        {files.map((file, index) => (
                                            <li key={`${file.name}-${index}`}>{file.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Creating..." : "Create Assignment"}
                            </Button>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.push("/tutor/files")}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}