export type Tutor = { id: string; name: string; email: string };
export type Student = { id: string; name: string; email: string; tutorId?: string | null };

type DB = {
    users: { email: string; password: string; role: "staff" }[];
    tutors: Tutor[];
    students: Student[];
};

const globalForDB = globalThis as unknown as { __mockDB?: DB };

export const db =
    globalForDB.__mockDB ??
    (globalForDB.__mockDB = {
        users: [{ email: "staff@demo.com", password: "123456", role: "staff" }],
        tutors: [
            { id: "t1", name: "Tutor 1", email: "tutor1@gmail.com" },
            { id: "t2", name: "Tutor 2", email: "tutor2@gmail.com" },
            { id: "t3", name: "Tutor 3", email: "tutor3@gmail.com" },
            { id: "t4", name: "Tutor 4", email: "tutor4@gmail.com" },
        ],
        students: [
            { id: "s1", name: "Student 1", email: "student1@gmail.com", tutorId: null },
            { id: "s2", name: "Student 2", email: "student2@gmail.com", tutorId: "t1" },
            { id: "s3", name: "Student 3", email: "student3@gmail.com", tutorId: null },
            { id: "s4", name: "Student 4", email: "student4@gmail.com", tutorId: null },
            { id: "s5", name: "Student 5", email: "student5@gmail.com", tutorId: null },
            { id: "s6", name: "Student 6", email: "student6@gmail.com", tutorId: null },
            { id: "s7", name: "Student 7", email: "student7@gmail.com", tutorId: null },
            { id: "s8", name: "Student 8", email: "student8@gmail.com", tutorId: null },
            { id: "s9", name: "Student 9", email: "student9@gmail.com", tutorId: null },
            { id: "s10", name: "Student 10", email: "student10@gmail.com", tutorId: null },
        ],
    });