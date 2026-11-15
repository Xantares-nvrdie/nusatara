import "dotenv/config";
import { randomInt, randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { and, eq } from "drizzle-orm";
import type { TSchema } from "elysia";
import { auth } from "@/auth";
import { ExamModel } from "@/backend/modules/exams/model";
import { ExamService } from "@/backend/modules/exams/service";
import { LearningModuleModel } from "@/backend/modules/learning-modules/model";
import { LearningModuleService } from "@/backend/modules/learning-modules/service";
import { isUniqueViolation } from "@/backend/utils/query";
import { db } from "./index";
import { account, EXAM_ACTIVE_PIN_INDEX, exams, learningModules, user } from "./schema";
import { DEMO_PASSWORD, SEED_TEACHERS } from "./seed-data";

/**
 * Demo seed: `bun run db:seed`.
 * Idempotent. Re-running resets the demo teachers' modules, exams, submissions and sign logs,
 * and resets their password to DEMO_PASSWORD. Data of other accounts is never touched.
 */

/** Fail before touching the DB if seed content doesn't match what the API itself accepts. */
function assertValid(schema: TSchema, value: unknown, label: string) {
    if (Value.Check(schema, value)) return;
    const issue = Value.Errors(schema, value).First();
    throw new Error(`Seed data "${label}" is invalid at ${issue?.path}: ${issue?.message}`);
}

function validateSeedData() {
    for (const teacher of SEED_TEACHERS) {
        for (const { exam, ...module } of teacher.modules) {
            assertValid(LearningModuleModel.createBody, module, module.title);
            assertValid(ExamModel.createBody, { title: exam.title, questions: exam.questions }, exam.title);
            for (const s of exam.submissions) {
                if (s.answers.length !== exam.questions.length) {
                    throw new Error(`Seed data "${exam.title}": ${s.studentName} must have one answer per question`);
                }
            }
        }
    }
}

async function upsertTeacher(name: string, email: string) {
    const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
    if (!existing) {
        // Sign up through Better Auth so the password hash matches its configured algorithm.
        const created = await auth.api.signUpEmail({ body: { name, email, password: DEMO_PASSWORD } });
        return { id: created.user.id, name, status: "dibuat" };
    }

    // Keep the documented demo password working even if someone changed it.
    const hash = await (await auth.$context).password.hash(DEMO_PASSWORD);
    const updated = await db
        .update(account)
        .set({ password: hash })
        .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")))
        .returning({ id: account.id });
    if (updated.length === 0) {
        await db.insert(account).values({
            id: randomUUID(),
            accountId: existing.id,
            providerId: "credential",
            userId: existing.id,
            password: hash,
        });
    }
    await db.update(user).set({ name }).where(eq(user.id, existing.id));
    return { id: existing.id, name, status: "sudah ada, password direset" };
}

/** Uses the fixed demo PIN when free; otherwise a random one (another active exam may already own it). */
async function insertExam(values: Omit<typeof exams.$inferInsert, "pin">, preferredPin: string) {
    const candidates = [
        preferredPin,
        ...Array.from({ length: 10 }, () => randomInt(0, 10_000).toString().padStart(4, "0")),
    ];
    for (const pin of candidates) {
        try {
            const [row] = await db
                .insert(exams)
                .values({ ...values, pin })
                .returning({ id: exams.id, pin: exams.pin });
            return row;
        } catch (error) {
            if (!isUniqueViolation(error, EXAM_ACTIVE_PIN_INDEX)) throw error;
        }
    }
    throw new Error(`No free PIN for exam "${values.title}"`);
}

async function main() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    const host = new URL(process.env.DATABASE_URL).host;
    console.log(`🌱 Seeding NusaTara demo data into ${host}`);

    validateSeedData();

    const accounts: { email: string; name: string; status: string }[] = [];
    const examRows: { teacher: string; title: string; pin: string; preferred: string; submissions: number }[] = [];
    let moduleCount = 0;

    for (const seed of SEED_TEACHERS) {
        const teacher = await upsertTeacher(seed.name, seed.email);
        accounts.push({ email: seed.email, name: seed.name, status: teacher.status });

        // Reset this demo teacher's data. Deleting exams cascades to their submissions.
        await db.delete(exams).where(eq(exams.teacherId, teacher.id));
        await db.delete(learningModules).where(eq(learningModules.teacherId, teacher.id));

        for (const { exam, ...moduleData } of seed.modules) {
            const created = await LearningModuleService.create(teacher, moduleData);
            moduleCount++;

            const row = await insertExam(
                {
                    teacherId: teacher.id,
                    moduleId: created.id,
                    title: exam.title,
                    questions: exam.questions.map((q, i) => ({ id: i + 1, ...q })),
                },
                exam.pin,
            );

            // Submit through the real service so scores use the production scoring logic.
            for (const s of exam.submissions) {
                await ExamService.submit(row.pin, {
                    studentName: s.studentName,
                    answers: s.answers.flatMap((answer, i) => (answer ? [{ questionId: i + 1, answer }] : [])),
                });
            }
            examRows.push({
                teacher: seed.name,
                title: exam.title,
                pin: row.pin,
                preferred: exam.pin,
                submissions: exam.submissions.length,
            });
        }
    }

    console.log(`\n✅ Selesai: ${moduleCount} modul, ${examRows.length} ujian.\n`);
    console.log(`👤 Akun guru (password: ${DEMO_PASSWORD})`);
    console.table(accounts);
    console.log("📝 PIN ujian aktif");
    console.table(
        examRows.map(({ preferred, ...r }) => ({
            ...r,
            catatan: r.pin === preferred ? "" : `PIN ${preferred} terpakai`,
        })),
    );
}

main()
    .then(async () => {
        await db.$client.end();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error("❌ Seed gagal:", error);
        await db.$client.end().catch(() => {});
        process.exit(1);
    });
