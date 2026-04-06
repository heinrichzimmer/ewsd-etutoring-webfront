"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type Attachment = {
    id: string;
    fileName: string;
};

type Assignment = {
    id: string;
    title: string;
    instructions: string;
    dueDate?: string | null;
    attachments: Attachment[];
};

function normalizeAttachment(raw: unknown): Attachment | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    const id =
        typeof obj.id === "string"
            ? obj.id
            : typeof obj.attachmentId === "string"
                ? obj.attachmentId
                : null;

    if (!id) return null;

    return {
        id,
        fileName:
            typeof obj.fileName === "string"
                ? obj.fileName
                : typeof obj.originalFileName === "string"
                    ? obj.originalFileName
                    : typeof obj.name === "string"
                        ? obj.name
                        : "Attachment",
    };
}

function normalizeAssignment(raw: unknown): Assignment | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    const attachmentsRaw = Array.isArray(obj.attachments) ? obj.attachments : [];

    return {
        id: obj.id,
        title:
            typeof obj.title === "string"
                ? obj.title
                : "Untitled Assignment",
        instructions:
            typeof obj.instructions === "string"
                ? obj.instructions
                : typeof obj.description === "string"
                    ? obj.description
                    : "",
        dueDate:
            typeof obj.dueDate === "string"
                ? obj.dueDate
                : typeof obj.deadline === "string"
                    ? obj.deadline
                    : null,
        attachments: attachmentsRaw
            .map(normalizeAttachment)
            .filter((x): x is Attachment => x !== null),
    };
}

export default function TutorEditAssignmentPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const assignmentId = params.id;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [title, setTitle] = useState("");
    const [instructions, setInstructions] = useState("");
    const [dueDate, setDueDate] = useState("");

    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [keepAttachmentIds, setKeepAttachmentIds] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);

    async function loadAssignment() {
        setLoading(true);

        const res = await fetch(`/api/tutor/assignments/${assignmentId}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load assignment");
            setLoading(false);
            return;
        }

        const assignment = normalizeAssignment(data);
        if (!assignment) {
            toast.error("Invalid assignment data.");
            setLoading(false);
            return;
        }

        setTitle(assignment.title);
        setInstructions(assignment.instructions);
        setDueDate(assignment.dueDate ?? "");
        setExistingAttachments(assignment.attachments);
        setKeepAttachmentIds(assignment.attachments.map((file) => file.id));

        setLoading(false);
    }

    useEffect(() => {
        if (!assignmentId) return;
        void loadAssignment();
    }, [assignmentId]);

    function onFileChange(e: ChangeEvent<HTMLInputElement>) {
        setNewFiles(Array.from(e.target.files ?? []));
    }

    function toggleKeepAttachment(attachmentId: string, checked: boolean) {
        setKeepAttachmentIds((prev) =>
            checked ? [...prev, attachmentId] : prev.filter((id) => id !== attachmentId)
        );
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

            keepAttachmentIds.forEach((id) => {
                formData.append("keepAttachmentIds", id);
            });

            newFiles.forEach((file) => {
                formData.append("attachments", file);
            });

            const res = await fetch(`/api/tutor/assignments/${assignmentId}`, {
                method: "PUT",
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to update assignment");
                return;
            }

            toast.success("Assignment updated successfully.");
            router.push(`/tutor/files/${assignmentId}`);
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Edit Assignment</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Update assignment details and attachments.
                    </p>
                </div>

                <Button variant="secondary" onClick={() => router.push(`/tutor/files/${assignmentId}`)}>
                    Back
                </Button>
            </div>

            {loading ? (
                <Card className="shadow-sm">
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Loading assignment...
                    </CardContent>
                </Card>
            ) : (
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Update Assignment</CardTitle>
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

                            <div className="space-y-3">
                                <div className="text-sm font-medium">Existing Attachments</div>

                                {existingAttachments.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No existing attachments.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {existingAttachments.map((file) => (
                                            <label
                                                key={file.id}
                                                className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={keepAttachmentIds.includes(file.id)}
                                                        onCheckedChange={(checked) =>
                                                            toggleKeepAttachment(file.id, Boolean(checked))
                                                        }
                                                    />
                                                    <div className="text-sm">{file.fileName}</div>
                                                </div>

                                                <a
                                                    href={`/api/assignments/attachments/${file.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-blue-600 underline"
                                                >
                                                    Download
                                                </a>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Add New Attachments</label>
                                <Input type="file" multiple onChange={onFileChange} />

                                {newFiles.length > 0 && (
                                    <div className="rounded-md border bg-slate-50 p-3 text-sm">
                                        <div className="mb-2 font-medium">New files</div>
                                        <ul className="space-y-1 text-muted-foreground">
                                            {newFiles.map((file, index) => (
                                                <li key={`${file.name}-${index}`}>{file.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? "Saving..." : "Save Changes"}
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => router.push(`/tutor/files/${assignmentId}`)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}