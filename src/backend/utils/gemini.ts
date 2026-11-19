import { GoogleGenAI, type GoogleGenAIInteraction } from "@google/genai";
import { Value } from "@sinclair/typebox/value";
import { type Static, status, type TSchema } from "elysia";

const DEFAULT_MODEL = "gemini-3.8-flash";
/**
 * Tried in order when the main model is overloaded (503 "high demand"), rate limited, or doesn't answer in time.
 * Override with GEMINI_FALLBACK_MODELS (comma separated; empty = no fallback). Measured 2026-11-19: availability
 * changed minute to minute; the Flash-Lite models usually still answered (8-25 s) while Flash returned 503,
 * timed out, or hit its rate limit. Each model has its own quota, so a fallback also helps on 429.
 */
const DEFAULT_FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
/**
 * Wall-clock budget for the whole call across all models. Stays below the API route's `maxDuration` (120 s)
 * so we can still answer with a clean error. A normal conversion takes ~30-40 s.
 */
const REQUEST_DEADLINE_MS = 110_000;
/** One model may hang under load instead of answering 503; cap each attempt so a fallback still gets its turn. */
const ATTEMPT_TIMEOUT_MS = 45_000;
/** Not worth starting another model with less time than this. */
const MIN_ATTEMPT_MS = 15_000;
/** Worth trying the next model: overload, rate limit, server errors, unknown model, or no HTTP answer at all. */
const FAILOVER_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);

let client: GoogleGenAI | undefined;

function getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[gemini] GEMINI_API_KEY is not set");
        throw status(503, { message: "Layanan AI belum dikonfigurasi. Hubungi admin." });
    }
    // Pin the stable API version so an SDK default change or GOOGLE_GENAI_API_VERSION can't switch it silently.
    client ??= new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1" } });
    return client;
}

function modelChain() {
    const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACK_MODELS.join(","))
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
    return [...new Set([primary, ...fallbacks])];
}

/**
 * Gemini structured output supports a subset of JSON Schema, and bounds such as minItems/maxItems
 * enlarge the decoding grammar (docs: "Simplifying complex schemas"). We therefore send only the
 * structural keywords plus descriptions, and enforce every bound locally with TypeBox after parsing.
 */
const GEMINI_SCHEMA_KEYWORDS = new Set(["type", "properties", "required", "items", "enum", "description"]);

export function toGeminiSchema(schema: unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
        if (!GEMINI_SCHEMA_KEYWORDS.has(key)) continue;
        if (key === "properties") {
            out.properties = Object.fromEntries(
                Object.entries(value as Record<string, unknown>).map(([name, child]) => [name, toGeminiSchema(child)]),
            );
        } else if (key === "items") {
            out.items = toGeminiSchema(value);
        } else {
            out[key] = value;
        }
    }
    return out;
}

export type GeminiInputPart =
    | { type: "text"; text: string }
    | { type: "document"; data: string; mime_type: "application/pdf" };

type GenerateStructuredOptions<T extends TSchema> = {
    schema: T;
    systemInstruction: string;
    input: GeminiInputPart[];
    maxOutputTokens: number;
};

type Failure = { error: unknown; timedOut: boolean };

/**
 * Calls Gemini (Interactions API) with a JSON schema and returns output validated against `schema`.
 * Throws Elysia `status()` errors with user-facing messages; provider details are only logged.
 *
 * Each model gets ONE attempt (SDK retries off): retrying an overloaded model with backoff used up the whole
 * budget and ended in a 504 after ~58 s. Moving straight to the next model answers in seconds instead.
 */
export async function generateStructured<T extends TSchema>({
    schema,
    systemInstruction,
    input,
    maxOutputTokens,
}: GenerateStructuredOptions<T>): Promise<Static<T>> {
    const ai = getClient();
    const startedAt = Date.now();
    const models = modelChain();

    let interaction: GoogleGenAIInteraction | undefined;
    let lastFailure: Failure | undefined;
    for (const [index, model] of models.entries()) {
        const remaining = REQUEST_DEADLINE_MS - (Date.now() - startedAt);
        if (index > 0 && remaining < MIN_ATTEMPT_MS) break;
        const attemptSignal = AbortSignal.timeout(Math.min(remaining, ATTEMPT_TIMEOUT_MS));
        try {
            interaction = await ai.interactions.create(
                {
                    model,
                    // Teacher material is processed once; nothing needs to be kept server-side at Google.
                    store: false,
                    system_instruction: systemInstruction,
                    // v1 takes input as steps; bare content parts are only accepted by v1beta.
                    input: [{ type: "user_input", content: input }],
                    generation_config: { thinking_level: "low", max_output_tokens: maxOutputTokens },
                    response_format: {
                        type: "text",
                        mime_type: "application/json",
                        schema: toGeminiSchema(schema),
                    },
                },
                { signal: attemptSignal, retries: { strategy: "none" } },
            );
            if (index > 0) console.warn(`[gemini] Answered by fallback model ${model}`);
            break;
        } catch (error) {
            lastFailure = { error, timedOut: attemptSignal.aborted };
            const info = describe(error);
            console.error(
                `[gemini] ${model} failed (${info.name}, status ${info.httpStatus ?? (lastFailure.timedOut ? "timeout" : "n/a")}): ${info.message}`,
            );
            const worthFailover =
                lastFailure.timedOut || info.httpStatus === undefined || FAILOVER_STATUSES.has(info.httpStatus);
            if (!worthFailover) break;
        }
    }

    if (!interaction) throw toHttpError(lastFailure);

    if (interaction.status !== "completed" || !interaction.output_text) {
        console.error(`[gemini] Interaction ended with status "${interaction.status}"`);
        throw status(502, { message: "AI tidak menyelesaikan proses konversi. Coba lagi atau persingkat materi." });
    }

    let data: unknown;
    try {
        data = JSON.parse(interaction.output_text);
    } catch {
        console.error("[gemini] Response is not valid JSON");
        throw status(502, { message: "Hasil AI tidak dapat dibaca. Silakan coba lagi." });
    }

    const cleaned = Value.Clean(schema, data);
    if (!Value.Check(schema, cleaned)) {
        const first = Value.Errors(schema, cleaned).First();
        console.error(`[gemini] Response failed validation at "${first?.path}": ${first?.message}`);
        throw status(502, { message: "Hasil AI tidak sesuai format. Silakan coba lagi." });
    }
    return cleaned as Static<T>;
}

type ProviderError = { name?: unknown; status?: unknown; statusCode?: unknown; message?: unknown; body?: unknown };

/** The SDK has several error classes; they expose the HTTP status as `statusCode` and/or `status`. */
function describe(error: unknown) {
    const err = (error ?? {}) as ProviderError;
    const httpStatus =
        typeof err.statusCode === "number" ? err.statusCode : typeof err.status === "number" ? err.status : undefined;
    const body = typeof err.body === "string" ? err.body : "";
    return {
        name: String(err.name ?? "Error"),
        httpStatus,
        body,
        message: providerMessage(body) ?? String(err.message ?? ""),
    };
}

/** User-facing error for the last failed attempt (all models failed, or a non-retryable error). */
function toHttpError(failure: Failure | undefined) {
    const { httpStatus, body } = describe(failure?.error);

    // An invalid key is reported as 400 with reason API_KEY_INVALID, not as 401.
    if (httpStatus === 401 || httpStatus === 403 || body.includes("API_KEY_INVALID")) {
        return status(503, { message: "Layanan AI belum dikonfigurasi dengan benar. Hubungi admin." });
    }
    if (httpStatus === 503) {
        return status(503, {
            message: "Layanan AI Google sedang sibuk karena banyak pengguna. Tunggu beberapa menit lalu coba lagi.",
        });
    }
    if (httpStatus === 429) {
        return status(429, { message: "Kuota AI sedang penuh. Tunggu sebentar lalu coba lagi." });
    }
    if (failure?.timedOut) {
        return status(504, { message: "AI terlalu lama merespons. Coba lagi atau persingkat materi." });
    }
    return status(502, { message: "Gagal memproses materi dengan AI. Silakan coba lagi." });
}

/** Extracts `error.message` from a Google API error body (object or single-item array). */
function providerMessage(body: string): string | undefined {
    try {
        const parsed = JSON.parse(body) as unknown;
        const first = (Array.isArray(parsed) ? parsed[0] : parsed) as { error?: { message?: unknown } } | undefined;
        return typeof first?.error?.message === "string" ? first.error.message : undefined;
    } catch {
        return undefined;
    }
}
