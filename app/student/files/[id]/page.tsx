"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Submission = {
    id: string;
    attachments: Attachment[];
    feedbackText?: string | null;
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
        title: typeof obj.title === "string" ? obj.title : "Untitled Assignment",
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

function normalizeSubmission(raw: unknown): Submission | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;

    if (typeof obj.id !== "string") return null;

    const attachmentsRaw =
        Array.isArray(obj.attachments) ? obj.attachments :
            Array.isArray(obj.files) ? obj.files :
                [];

    return {
        id: obj.id,
        attachments: attachmentsRaw
            .map(normalizeAttachment)
            .filter((x): x is Attachment => x !== null),
        feedbackText:
            typeof obj.feedbackText === "string"
                ? obj.feedbackText
                : typeof obj.feedback === "string"
                    ? obj.feedback
                    : null,
    };
}

export default function StudentAssignmentDetailPage() {
    const params = useParams<{ id: string }>();
    const assignmentId = params.id;

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    async function load() {
        setLoading(true);

        const [assignmentRes, submissionRes] = await Promise.all([
            fetch(`/api/student/assignments/${assignmentId}`),
            fetch(`/api/student/assignments/${assignmentId}/submission`),
        ]);

        const assignmentData = await assignmentRes.json().catch(() => ({}));
        const submissionData = await submissionRes.json().catch(() => ({}));

        if (!assignmentRes.ok) {
            toast.error(assignmentData?.message ?? "Failed to load assignment");
            setLoading(false);
            return;
        }

        setAssignment(normalizeAssignment(assignmentData));

        if (submissionRes.ok) {
            setSubmission(normalizeSubmission(submissionData));
        } else {
            setSubmission(null);
        }

        setLoading(false);
    }

    useEffect(() => {
        if (!assignmentId) return;
        void load();
    }, [assignmentId]);

    function onFileChange(e: ChangeEvent<HTMLInputElement>) {
        setFiles(Array.from(e.target.files ?? []));
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault();

        if (files.length === 0) {
            toast.error("Please choose at least one file.");
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            files.forEach((file) => {
                formData.append("files", file);
            });

            const res = await fetch(`/api/student/assignments/${assignmentId}/submission`, {
                method: "PUT",
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to upload submission");
                return;
            }

            toast.success("Submission uploaded successfully.");
            setFiles([]);
            await load();
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Assignment Detail</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Read the task and upload your work for your tutor.
                    </p>
                </div>

                <Button asChild variant="secondary">
                    <Link href="/student/files">Back</Link>
                </Button>
            </div>

            {loading ? (
                <Card className="shadow-sm">
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Loading assignment...
                    </CardContent>
                </Card>
            ) : !assignment ? (
                <Card className="shadow-sm">
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Assignment not found.
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>{assignment.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                Due: {assignment.dueDate ?? "-"}
                            </div>

                            <div className="whitespace-pre-wrap text-sm">
                                {assignment.instructions || "-"}
                            </div>

                            <div className="space-y-2">
                                <div className="font-medium text-sm">Assignment Files</div>
                                {assignment.attachments.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No files attached.</div>
                                ) : (
                                    assignment.attachments.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2"
                                        >
                                            <div className="text-sm">{file.fileName}</div>
                                            <Button asChild size="sm" variant="secondary">
                                                <a
                                                    href={`/api/assignments/attachments/${file.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Download
                                                </a>
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">My Submission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {submission ? (
                                <div className="space-y-3">
                                    <div className="text-sm font-medium">Uploaded Files</div>

                                    {submission.attachments.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">
                                            No submitted files found.
                                        </div>
                                    ) : (
                                        submission.attachments.map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2"
                                            >
                                                <div className="text-sm">{file.fileName}</div>
                                                <Button asChild size="sm" variant="secondary">
                                                    <a
                                                        href={`/api/assignments/submissions/attachments/${file.id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Download
                                                    </a>
                                                </Button>
                                            </div>
                                        ))
                                    )}

                                    <div className="space-y-1">
                                        <div className="text-sm font-medium">Tutor Feedback</div>
                                        <div className="rounded-md border bg-slate-50 p-3 text-sm">
                                            {submission.feedbackText || "No feedback yet."}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    You have not submitted this assignment yet.
                                </div>
                            )}

                            <form onSubmit={onSubmit} className="space-y-3">
                                <div className="text-sm font-medium">
                                    {submission ? "Replace Submission" : "Upload Submission"}
                                </div>

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

                                <Button type="submit" disabled={uploading}>
                                    {uploading ? "Uploading..." : submission ? "Update Submission" : "Submit Assignment"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}