import { t } from "elysia";
import {
    DeafVisualSummary,
    ErrorResponse,
    ExamQuestionInput,
    IdParams,
    NonEmptyString,
    Paginated,
    PaginationQuery,
} from "@/backend/utils/model";

export const MAX_CONTENT_CHARS = 100_000;
export const MAX_AUDIO_SCRIPT_CHARS = 50_000;
/** Vercel rejects request bodies above 4.5 MB, so uploads are capped just below it. */
export const MAX_UPLOAD_SIZE = "4m";
export const MAX_PDF_PAGES = 30;
export const MAX_GENERATED_QUESTIONS = 20;
export const DEFAULT_GENERATED_QUESTIONS = 5;
/** The glossary endpoint reads terms from this many of the newest modules, to keep the payload bounded. */
export const GLOSSARY_MODULE_LIMIT = 100;
/** Same bound for the concept-map overview. */
export const CONCEPT_MAP_MODULE_LIMIT = 100;

const ModuleListItem = t.Object({
    id: t.String(),
    title: t.String(),
    teacherName: t.String(),
    summary: t.String({ description: "Inti materi (deafVisualSummary.summary), untuk kartu modul" }),
    createdAt: t.Date(),
});

/** What a teacher saves or edits. */
const ModuleContent = t.Object({
    title: NonEmptyString(200),
    rawContent: NonEmptyString(MAX_CONTENT_CHARS),
    blindAudioScript: NonEmptyString(MAX_AUDIO_SCRIPT_CHARS),
    deafVisualSummary: DeafVisualSummary,
});

const ModuleDetail = t.Object({
    id: t.String(),
    title: t.String(),
    teacherName: t.String(),
    rawContent: t.String(),
    blindAudioScript: t.String(),
    deafVisualSummary: DeafVisualSummary,
    createdAt: t.Date(),
});

export const LearningModuleModel = {
    params: IdParams,
    listQuery: t.Object({
        ...PaginationQuery.properties,
        q: t.Optional(t.String({ maxLength: 100, description: "Cari berdasarkan judul" })),
    }),
    convertBody: t.Object({
        title: t.Optional(NonEmptyString(200)),
        content: t.Optional(
            NonEmptyString(MAX_CONTENT_CHARS, { description: "Teks/ringkasan materi. Kirim ini ATAU file." }),
        ),
        file: t.Optional(
            t.File({ maxSize: MAX_UPLOAD_SIZE, description: "File materi PDF atau TXT. Kirim ini ATAU content." }),
        ),
        questionCount: t.Optional(
            t.Integer({ minimum: 1, maximum: MAX_GENERATED_QUESTIONS, default: DEFAULT_GENERATED_QUESTIONS }),
        ),
    }),
    /** Shaped so `questions` can go straight to POST /exams and the rest to POST /modules. */
    convertResponse: t.Object({
        title: t.String(),
        rawContent: t.String(),
        blindAudioScript: t.String(),
        deafVisualSummary: DeafVisualSummary,
        questions: t.Array(ExamQuestionInput),
    }),
    createBody: ModuleContent,
    /** Editing replaces the whole content; the editor always sends every field. */
    updateBody: ModuleContent,
    listResponse: Paginated(ModuleListItem),
    conceptMapResponse: t.Object({
        items: t.Array(
            t.Object({
                moduleId: t.String(),
                moduleTitle: t.String(),
                conceptMap: DeafVisualSummary.properties.conceptMap,
            }),
        ),
    }),
    glossaryResponse: t.Object({
        items: t.Array(
            t.Object({
                term: t.String(),
                definition: t.String(),
                moduleId: t.String(),
                moduleTitle: t.String(),
            }),
        ),
    }),
    detail: ModuleDetail,
    error: ErrorResponse,
} as const;

export type ConvertBody = typeof LearningModuleModel.convertBody.static;
export type ConvertResult = typeof LearningModuleModel.convertResponse.static;
export type CreateModuleBody = typeof LearningModuleModel.createBody.static;
export type UpdateModuleBody = typeof LearningModuleModel.updateBody.static;
export type ListModulesQuery = typeof LearningModuleModel.listQuery.static;
