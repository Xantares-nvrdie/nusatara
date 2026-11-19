import { and, count, desc, eq, ilike, sql } from "drizzle-orm";
import { status } from "elysia";
import { extractText } from "unpdf";
import type { DeafVisualSummary } from "@/backend/utils/model";
import { escapeLike, pageParams, toOffset } from "@/backend/utils/query";
import { db } from "@/db";
import { learningModules, user } from "@/db/schema";
import { convertMaterial, type MaterialSource } from "./converter";
import {
    CONCEPT_MAP_MODULE_LIMIT,
    type ConvertBody,
    type ConvertResult,
    type CreateModuleBody,
    DEFAULT_GENERATED_QUESTIONS,
    GLOSSARY_MODULE_LIMIT,
    type ListModulesQuery,
    MAX_CONTENT_CHARS,
    MAX_PDF_PAGES,
    type UpdateModuleBody,
} from "./model";

/** PDFs with less extractable text than this are treated as scanned images. */
const MIN_PDF_TEXT_CHARS = 100;
const TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown"]);
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

const baseColumns = {
    id: learningModules.id,
    title: learningModules.title,
    teacherName: user.name,
    createdAt: learningModules.createdAt,
};

/** List items carry only the one-line summary from the visual summary, not the module bodies. */
const listColumns = {
    ...baseColumns,
    summary: sql<string>`${learningModules.deafVisualSummary} ->> 'summary'`,
};

const detailColumns = {
    ...baseColumns,
    rawContent: learningModules.rawContent,
    blindAudioScript: learningModules.blindAudioScript,
    deafVisualSummary: learningModules.deafVisualSummary,
};

const moduleValues = (body: CreateModuleBody | UpdateModuleBody) => ({
    title: body.title.trim(),
    rawContent: body.rawContent.trim(),
    blindAudioScript: body.blindAudioScript.trim(),
    deafVisualSummary: body.deafVisualSummary,
});

const toDetail = (row: typeof learningModules.$inferSelect, teacherName: string) => ({
    id: row.id,
    title: row.title,
    teacherName,
    rawContent: row.rawContent,
    blindAudioScript: row.blindAudioScript,
    deafVisualSummary: row.deafVisualSummary,
    createdAt: row.createdAt,
});

const normalizeText = (text: string) =>
    text
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

function assertLength(text: string) {
    if (text.length > MAX_CONTENT_CHARS) {
        throw status(422, {
            message: `Materi terlalu panjang (maksimal ${MAX_CONTENT_CHARS.toLocaleString("id-ID")} karakter). Bagi menjadi beberapa modul.`,
        });
    }
    return text;
}

const isPdf = (bytes: Uint8Array) => PDF_SIGNATURE.every((byte, i) => bytes[i] === byte);

const isTextFile = (file: File) => {
    const mime = file.type.split(";")[0].trim().toLowerCase();
    return TEXT_MIME_TYPES.has(mime) || /\.(txt|md)$/i.test(file.name);
};

/** Validates the upload by content (not just the declared MIME type) and prepares it for Gemini. */
async function readMaterialSource({ content, file }: Pick<ConvertBody, "content" | "file">): Promise<MaterialSource> {
    if ((content === undefined) === (file === undefined)) {
        throw status(400, { message: "Kirim salah satu: teks materi (content) atau file PDF/TXT (file)." });
    }
    if (content !== undefined) return { kind: "text", text: assertLength(normalizeText(content)) };

    const upload = file as File;
    const bytes = new Uint8Array(await upload.arrayBuffer());

    if (isPdf(bytes)) {
        // Encode first: PDF.js may detach the buffer it is given.
        const base64 = Buffer.from(bytes).toString("base64");
        let extracted: { totalPages: number; text: string };
        try {
            extracted = await extractText(bytes.slice(), { mergePages: true });
        } catch (error) {
            console.warn("[modules] PDF text extraction failed:", error instanceof Error ? error.message : error);
            throw status(422, {
                message: "PDF tidak dapat dibaca. Pastikan file tidak rusak atau terkunci kata sandi.",
            });
        }
        if (extracted.totalPages > MAX_PDF_PAGES) {
            throw status(422, {
                message: `PDF maksimal ${MAX_PDF_PAGES} halaman. Bagi materi menjadi beberapa modul.`,
            });
        }
        const text = assertLength(normalizeText(extracted.text));
        return { kind: "pdf", base64, text, needsTranscription: text.length < MIN_PDF_TEXT_CHARS };
    }

    if (isTextFile(upload)) {
        let text: string;
        try {
            text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch {
            throw status(422, { message: "File teks harus berformat UTF-8." });
        }
        text = assertLength(normalizeText(text));
        if (!text) throw status(422, { message: "File teks kosong." });
        return { kind: "text", text };
    }

    throw status(415, { message: "Format file tidak didukung. Gunakan PDF atau TXT." });
}

export const LearningModuleService = {
    /** PRD F-01: converts material into an audio script, a visual summary, and draft exam questions. Nothing is saved. */
    async convert(body: ConvertBody): Promise<ConvertResult> {
        const source = await readMaterialSource(body);
        const title = body.title?.trim();
        const questionCount = body.questionCount ?? DEFAULT_GENERATED_QUESTIONS;

        const output = await convertMaterial(source, { title, questionCount });

        const rawContent =
            source.kind === "pdf" && source.needsTranscription
                ? assertLength(normalizeText(output.sourceText ?? ""))
                : source.text;

        return {
            title: title || output.title.trim(),
            rawContent,
            blindAudioScript: normalizeText(output.blindAudioScript),
            deafVisualSummary: output.deafVisualSummary,
            questions: output.questions.slice(0, questionCount),
        };
    },

    async create(teacher: { id: string; name: string }, body: CreateModuleBody) {
        const [row] = await db
            .insert(learningModules)
            .values({ teacherId: teacher.id, ...moduleValues(body) })
            .returning();
        return toDetail(row, teacher.name);
    },

    /**
     * Saves the teacher's edits. Only the owner can edit; anyone else gets 404, like a missing module.
     * Exams made from this module keep their own copy of the questions, so they don't change.
     */
    async update(teacher: { id: string; name: string }, id: string, body: UpdateModuleBody) {
        const [row] = await db
            .update(learningModules)
            .set(moduleValues(body))
            .where(and(eq(learningModules.id, id), eq(learningModules.teacherId, teacher.id)))
            .returning();
        if (!row) throw status(404, { message: "Modul tidak ditemukan." });
        return toDetail(row, teacher.name);
    },

    /** Lightweight list (no content bodies) to keep payloads small on low-bandwidth connections. */
    async list(query: ListModulesQuery, teacherId?: string) {
        const { page, pageSize } = pageParams(query.page, query.pageSize);
        const search = query.q?.trim();
        const where = and(
            teacherId ? eq(learningModules.teacherId, teacherId) : undefined,
            search ? ilike(learningModules.title, `%${escapeLike(search)}%`) : undefined,
        );

        const [[{ total }], items] = await Promise.all([
            db.select({ total: count() }).from(learningModules).where(where),
            db
                .select(listColumns)
                .from(learningModules)
                .innerJoin(user, eq(user.id, learningModules.teacherId))
                .where(where)
                .orderBy(desc(learningModules.createdAt), desc(learningModules.id))
                .limit(pageSize)
                .offset(toOffset(page, pageSize)),
        ]);
        return { items, total, page, pageSize };
    },

    /**
     * Glossary terms (term + definition) from the newest modules, flattened and sorted A-Z for the
     * student "Kamus Istilah" page. Only the JSONB glossary is read, not the module bodies.
     */
    async glossary() {
        const rows = await db
            .select({
                moduleId: learningModules.id,
                moduleTitle: learningModules.title,
                glossary: sql<DeafVisualSummary["glossary"] | null>`${learningModules.deafVisualSummary} -> 'glossary'`,
            })
            .from(learningModules)
            .orderBy(desc(learningModules.createdAt), desc(learningModules.id))
            .limit(GLOSSARY_MODULE_LIMIT);

        const items = rows.flatMap(({ moduleId, moduleTitle, glossary }) =>
            (glossary ?? []).map(({ term, definition }) => ({ term, definition, moduleId, moduleTitle })),
        );
        items.sort((a, b) => a.term.localeCompare(b.term, "id", { sensitivity: "base" }));
        return { items };
    },

    /** Concept map of each of the newest modules, for the student "Peta Konsep" page. Reads only that JSONB key. */
    async conceptMaps() {
        const items = await db
            .select({
                moduleId: learningModules.id,
                moduleTitle: learningModules.title,
                conceptMap: sql<DeafVisualSummary["conceptMap"]>`${learningModules.deafVisualSummary} -> 'conceptMap'`,
            })
            .from(learningModules)
            .orderBy(desc(learningModules.createdAt), desc(learningModules.id))
            .limit(CONCEPT_MAP_MODULE_LIMIT);
        return { items };
    },

    async getById(id: string) {
        const [row] = await db
            .select(detailColumns)
            .from(learningModules)
            .innerJoin(user, eq(user.id, learningModules.teacherId))
            .where(eq(learningModules.id, id))
            .limit(1);
        if (!row) throw status(404, { message: "Modul tidak ditemukan." });
        return row;
    },
};
