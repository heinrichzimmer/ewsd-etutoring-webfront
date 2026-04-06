"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Attachment = {
    id: string;
    fileName: string;
};

type SubmissionSummary = {
    id: string;
    studentName: string;
    studentUserId?: string;
};

type SubmissionDetail = {
    id: string;
    attachments: Attachment[];
    feedbackText?: string | null;
    studentName?: string;
};

type Assignment = {
    id: string;
    title: string;
    instructions: string;
    dueDate?: string | null;
    attachments: Attachment[];
    submissions: SubmissionSummary[];
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

    const attachmentsRaw: unknown[] = Array.isArray(obj.attachments) ? obj.attachments : [];
    const submissionsRaw: unknown[] =
        Array.isArray(obj.submissions)
            ? obj.submissions
            : Array.isArray(obj.assignmentSubmissions)
                ? obj.assignmentSubmissions
                : [];

    const submissions = submissionsRaw.reduce<SubmissionSummary[]>((acc, item) => {
        if (!item || typeof item !== "object") return acc;

        const s = item as Record<string, unknown>;
        if (typeof s.id !== "string") return acc;

        const student =
            (s.student as Record<string, unknown> | undefined) ??
            undefined;

        const studentName =
            student
                ? `${typeof student.firstName === "string" ? student.firstName : ""} ${
                    typeof student.lastName === "string" ? student.lastName : ""
                }`.trim() ||
                (typeof student.username === "string" ? student.username : "") ||
                "Student"
                : typeof s.studentName === "string"
                    ? s.studentName
                    : "Student";

        const studentUserId =
            student && typeof student.id === "string"
                ? student.id
                : typeof s.studentUserId === "string"
                    ? s.studentUserId
                    : undefined;

        acc.push({
            id: s.id,
            studentName,
            studentUserId,
        });

        return acc;
    }, []);

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
        submissions,
    };
}

function normalizeSubmissionDetail(raw: unknown): SubmissionDetail | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;

    const attachmentsRaw =
        Array.isArray(obj.attachments) ? obj.attachments :
            Array.isArray(obj.files) ? obj.files :
                [];

    const student =
        (obj.student as Record<string, unknown> | undefined) ??
        undefined;

    const studentName =
        student
            ? `${typeof student.firstName === "string" ? student.firstName : ""} ${
                typeof student.lastName === "string" ? student.lastName : ""
            }`.trim() ||
            (typeof student.username === "string" ? student.username : "")
            : typeof obj.studentName === "string"
                ? obj.studentName
                : "";

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
        studentName,
    };
}

export default function TutorAssignmentDetailPage() {
    const params = useParams<{ id: string }>();
    const assignmentId = params.id;

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetail | null>(null);
    const [feedbackText, setFeedbackText] = useState("");
    const [loading, setLoading] = useState(true);
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    async function loadAssignment() {
        setLoading(true);

        const res = await fetch(`/api/tutor/assignments/${assignmentId}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load assignment");
            setLoading(false);
            return;
        }

        setAssignment(normalizeAssignment(data));
        setLoading(false);
    }

    useEffect(() => {
        if (!assignmentId) return;
        void loadAssignment();
    }, [assignmentId]);

    async function openSubmission(submissionId: string) {
        const res = await fetch(`/api/tutor/assignments/${assignmentId}/submissions/${submissionId}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            toast.error(data?.message ?? "Failed to load submission");
            return;
        }

        const normalized = normalizeSubmissionDetail(data);
        setSelectedSubmission(normalized);
        setFeedbackText(normalized?.feedbackText ?? "");
    }

    async function onSubmitFeedback(e: FormEvent) {
        e.preventDefault();

        if (!selectedSubmission) {
            toast.error("Please open a submission first.");
            return;
        }

        setFeedbackLoading(true);

        try {
            const res = await fetch(
                `/api/tutor/assignments/${assignmentId}/submissions/${selectedSubmission.id}/feedback`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        feedbackText,
                    }),
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data?.message ?? "Failed to save feedback");
                return;
            }

            toast.success("Feedback saved.");
            await openSubmission(selectedSubmission.id);
        } finally {
            setFeedbackLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Assignment Detail</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Review student submissions and give feedback.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button asChild variant="secondary">
                        <Link href="/tutor/files">Back</Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href={`/tutor/files/${assignmentId}/edit`}>Edit</Link>
                    </Button>
                </div>
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

                    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Submissions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {assignment.submissions.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                        No submissions yet.
                                    </div>
                                ) : (
                                    assignment.submissions.map((submission) => (
                                        <div
                                            key={submission.id}
                                            className="rounded-lg border bg-slate-50 p-3"
                                        >
                                            <div className="font-medium">
                                                {submission.studentName || "Student Submission"}
                                            </div>
                                            <div className="mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => void openSubmission(submission.id)}
                                                >
                                                    Open Submission
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Submission Detail</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!selectedSubmission ? (
                                    <div className="text-sm text-muted-foreground">
                                        Select a submission from the left side.
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-medium">
                                            {selectedSubmission.studentName || "Student"}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-sm font-medium">Submitted Files</div>

                                            {selectedSubmission.attachments.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">
                                                    No submitted files found.
                                                </div>
                                            ) : (
                                                selectedSubmission.attachments.map((file) => (
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
                                        </div>

                                        <form onSubmit={onSubmitFeedback} className="space-y-3">
                                            <div className="text-sm font-medium">Feedback</div>
                                            <Input
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder="Write feedback..."
                                            />
                                            <Button type="submit" disabled={feedbackLoading}>
                                                {feedbackLoading ? "Saving..." : "Save Feedback"}
                                            </Button>
                                        </form>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}