import { GoogleGenAI, type GoogleGenAIInteraction } from "@google/genai";
import { Value } from "@sinclair/typebox/value";
import { type Static, status, type TSchema } from "elysia";
import { chatCompletionJson, errorMessageFromBody, type GatewayConfig, gatewayConfig } from "./openai-compatible";

/**
 * Two providers, tried in this order:
 * 1. The AI gateway (SumoPod, paid; see openai-compatible.ts), when AI_GATEWAY_API_KEY is set and the input is text.
 * 2. Google AI Studio directly (GEMINI_API_KEY, free tier), as the backup. It is also the only provider for scanned
 *    PDFs, because it reads the PDF file itself.
 */

const DEFAULT_GOOGLE_MODEL = "gemini-3.8-flash";
/**
 * Tried in order when the Google model is overloaded (503 "high demand"), rate limited, or doesn't answer in time.
 * Override with GEMINI_FALLBACK_MODELS (comma separated; empty = no fallback). Measured 2026-11-19: availability
 * changed minute to minute; the Flash-Lite models usually still answered (8-25 s) while Flash returned 503,
 * timed out, or hit its rate limit. Each model has its own free-tier quota, so a fallback also helps on 429.
 */
const DEFAULT_GOOGLE_FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
/**
 * Wall-clock budgets, measured from the start of the request. A normal conversion takes ~30-50 s. Every budget
 * stays below the API route's `maxDuration` (210 s) so we can still answer with a clean error.
 */
const TOTAL_DEADLINE_MS = 200_000;
/** The gateway stops here when Google is configured as a backup, so Google still gets two attempts. */
const GATEWAY_DEADLINE_WITH_BACKUP_MS = 110_000;
/** Google alone (no gateway, or a scanned PDF). */
const GOOGLE_ONLY_DEADLINE_MS = 110_000;
/** The paid gateway rarely sheds load, so give one attempt time to finish a long material. */
const GATEWAY_ATTEMPT_TIMEOUT_MS = 100_000;
/** A Google model may hang under load instead of answering 503; cap each attempt so a fallback still gets its turn. */
const GOOGLE_ATTEMPT_TIMEOUT_MS = 45_000;
/** Not worth starting another model with less time than this. */
const MIN_ATTEMPT_MS = 15_000;
/** Worth trying the next Google model: overload, rate limit, server errors, unknown model, or no HTTP answer. */
const GOOGLE_FAILOVER_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);
/** Gateway errors that every gateway model would hit too: bad key, AI balance used up (402), key not allowed. */
const GATEWAY_STOP_STATUSES = new Set([401, 402, 403]);

let client: GoogleGenAI | undefined;

function getClient(apiKey: string) {
    // Pin the stable API version so an SDK default change or GOOGLE_GENAI_API_VERSION can't switch it silently.
    client ??= new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1" } });
    return client;
}

function googleModels() {
    const primary = process.env.GEMINI_MODEL || DEFAULT_GOOGLE_MODEL;
    const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_GOOGLE_FALLBACK_MODELS.join(","))
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
    /** The request for Google, which can also take a PDF file. */
    input: GeminiInputPart[];
    /** The same request as plain text, for the gateway. Omit when only Google can read the input (scanned PDF). */
    textInput?: string;
    maxOutputTokens: number;
};

type Provider = "gateway" | "google";

type Attempt = {
    provider: Provider;
    model: string;
    /** Latest time (ms since epoch) this attempt may run until. */
    end: number;
    /** Longest this attempt may take. */
    timeout: number;
    /** Returns the model's JSON text, or "" when it stopped without a complete answer. */
    run: (signal: AbortSignal) => Promise<string>;
};

type Failure =
    | { kind: "request"; error: unknown; timedOut: boolean }
    | { kind: "output"; reason: "incomplete" | "not-json" | "invalid" };

/**
 * Generates JSON that matches `schema`, trying the gateway models, then the Google models. Throws Elysia
 * `status()` errors with user-facing messages; provider details are only logged.
 *
 * Each model gets ONE attempt (SDK retries off): retrying an overloaded model with backoff used up the whole
 * budget and ended in a 504 after ~58 s. Moving straight to the next model answers in seconds instead.
 * An answer that is cut off, not JSON, or doesn't match the schema also moves on to the next model.
 */
export async function generateStructured<T extends TSchema>({
    schema,
    systemInstruction,
    input,
    textInput,
    maxOutputTokens,
}: GenerateStructuredOptions<T>): Promise<Static<T>> {
    const startedAt = Date.now();
    const googleKey = process.env.GEMINI_API_KEY?.trim();
    const gateway = textInput ? gatewayConfig() : null;
    if (!gateway && !googleKey) {
        console.error(
            textInput
                ? "[ai] Neither AI_GATEWAY_API_KEY nor GEMINI_API_KEY is set"
                : "[ai] GEMINI_API_KEY is not set (needed for scanned PDFs)",
        );
        throw status(503, { message: "Layanan AI belum dikonfigurasi. Hubungi admin." });
    }
    const geminiSchema = toGeminiSchema(schema);

    const attempts: Attempt[] = [];
    if (gateway && textInput) {
        const end = startedAt + (googleKey ? GATEWAY_DEADLINE_WITH_BACKUP_MS : TOTAL_DEADLINE_MS);
        for (const model of gateway.models) {
            attempts.push({
                provider: "gateway",
                model,
                end,
                timeout: GATEWAY_ATTEMPT_TIMEOUT_MS,
                run: (signal) =>
                    runGateway(
                        gateway,
                        model,
                        { system: systemInstruction, user: textInput, schema: geminiSchema, maxOutputTokens },
                        signal,
                    ),
            });
        }
    }
    if (googleKey) {
        const ai = getClient(googleKey);
        const end = startedAt + (attempts.length ? TOTAL_DEADLINE_MS : GOOGLE_ONLY_DEADLINE_MS);
        for (const model of googleModels()) {
            attempts.push({
                provider: "google",
                model,
                end,
                timeout: GOOGLE_ATTEMPT_TIMEOUT_MS,
                run: (signal) =>
                    runGoogle(ai, model, { systemInstruction, input, geminiSchema, maxOutputTokens }, signal),
            });
        }
    }

    let lastFailure: Failure | undefined;
    const stopped = new Set<Provider>();
    for (const [index, attempt] of attempts.entries()) {
        if (stopped.has(attempt.provider)) continue;
        const remaining = attempt.end - Date.now();
        if (index > 0 && remaining < MIN_ATTEMPT_MS) continue;
        const label = `[ai-${attempt.provider}] ${attempt.model}`;
        const signal = AbortSignal.timeout(Math.min(remaining, attempt.timeout));
        const attemptStart = Date.now();

        let text: string;
        try {
            text = await attempt.run(signal);
        } catch (error) {
            const failure = { kind: "request", error, timedOut: signal.aborted } as const;
            lastFailure = failure;
            const info = describe(error);
            console.error(
                `${label} failed after ${seconds(attemptStart)} (${info.name}, status ${info.httpStatus ?? (failure.timedOut ? "timeout" : "n/a")}): ${info.message}`,
            );
            if (!worthNextModel(attempt.provider, info.httpStatus, failure.timedOut)) stopped.add(attempt.provider);
            continue;
        }

        const result = parseOutput(schema, text);
        if (result.ok) {
            console.info(
                `${label} answered in ${seconds(attemptStart)}${index > 0 ? " (after earlier models failed)" : ""}`,
            );
            return result.data;
        }
        lastFailure = { kind: "output", reason: result.reason };
        console.error(
            `${label} gave an unusable answer after ${seconds(attemptStart)} (${result.reason})${result.detail ? `: ${result.detail}` : ""}`,
        );
    }

    throw toHttpError(lastFailure);
}

const seconds = (since: number) => `${((Date.now() - since) / 1000).toFixed(1)} s`;

async function runGateway(
    config: GatewayConfig,
    model: string,
    request: { system: string; user: string; schema: Record<string, unknown>; maxOutputTokens: number },
    signal: AbortSignal,
) {
    const { text, finishReason } = await chatCompletionJson(config, { model, ...request, signal });
    // Cut off at the output cap: the JSON is unfinished.
    if (finishReason === "length") return "";
    return text;
}

async function runGoogle(
    ai: GoogleGenAI,
    model: string,
    request: {
        systemInstruction: string;
        input: GeminiInputPart[];
        geminiSchema: Record<string, unknown>;
        maxOutputTokens: number;
    },
    signal: AbortSignal,
) {
    const interaction: GoogleGenAIInteraction = await ai.interactions.create(
        {
            model,
            // Teacher material is processed once; nothing needs to be kept server-side at Google.
            store: false,
            system_instruction: request.systemInstruction,
            // v1 takes input as steps; bare content parts are only accepted by v1beta.
            input: [{ type: "user_input", content: request.input }],
            generation_config: { thinking_level: "low", max_output_tokens: request.maxOutputTokens },
            response_format: { type: "text", mime_type: "application/json", schema: request.geminiSchema },
        },
        { signal, retries: { strategy: "none" } },
    );
    if (interaction.status !== "completed") {
        console.error(`[ai-google] ${model} interaction ended with status "${interaction.status}"`);
        return "";
    }
    return interaction.output_text ?? "";
}

function worthNextModel(provider: Provider, httpStatus: number | undefined, timedOut: boolean) {
    if (timedOut || httpStatus === undefined) return true;
    if (provider === "google") return GOOGLE_FAILOVER_STATUSES.has(httpStatus);
    // Another gateway model may accept a request one rejected (400) or still exist (404 / 410 retired).
    return !GATEWAY_STOP_STATUSES.has(httpStatus);
}

type ParseResult<T> =
    | { ok: true; data: T }
    | { ok: false; reason: "incomplete" | "not-json" | "invalid"; detail?: string };

function parseOutput<T extends TSchema>(schema: T, text: string): ParseResult<Static<T>> {
    if (!text.trim()) return { ok: false, reason: "incomplete" };
    // Models in plain JSON mode sometimes still wrap the object in a ```json fence or add a sentence around it.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    let data: unknown;
    try {
        data = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
    } catch {
        return { ok: false, reason: "not-json" };
    }
    const cleaned = Value.Clean(schema, data);
    if (!Value.Check(schema, cleaned)) {
        const first = Value.Errors(schema, cleaned).First();
        return { ok: false, reason: "invalid", detail: `"${first?.path}" ${first?.message}` };
    }
    return { ok: true, data: cleaned as Static<T> };
}

type ProviderError = { name?: unknown; status?: unknown; statusCode?: unknown; message?: unknown; body?: unknown };

/** Provider errors expose the HTTP status as `statusCode` and/or `status` (Gemini SDK classes, ProviderHttpError). */
function describe(error: unknown) {
    const err = (error ?? {}) as ProviderError;
    const httpStatus =
        typeof err.statusCode === "number" ? err.statusCode : typeof err.status === "number" ? err.status : undefined;
    const body = typeof err.body === "string" ? err.body : "";
    return {
        name: String(err.name ?? "Error"),
        httpStatus,
        body,
        message: errorMessageFromBody(body) ?? String(err.message ?? ""),
    };
}

/** User-facing error for the last failed attempt, after every model failed or was skipped. */
function toHttpError(failure: Failure | undefined) {
    if (failure?.kind === "output") {
        if (failure.reason === "incomplete") {
            return status(502, {
                message: "AI tidak menyelesaikan proses konversi. Coba lagi atau persingkat materi.",
            });
        }
        if (failure.reason === "not-json") {
            return status(502, { message: "Hasil AI tidak dapat dibaca. Silakan coba lagi." });
        }
        return status(502, { message: "Hasil AI tidak sesuai format. Silakan coba lagi." });
    }

    const { httpStatus, body } = describe(failure?.error);
    // An invalid Google key is reported as 400 with reason API_KEY_INVALID, not as 401. 402: gateway balance used up.
    if (httpStatus === 401 || httpStatus === 402 || httpStatus === 403 || body.includes("API_KEY_INVALID")) {
        return status(503, { message: "Layanan AI belum dikonfigurasi dengan benar. Hubungi admin." });
    }
    if (httpStatus === 503) {
        return status(503, {
            message: "Layanan AI sedang sibuk karena banyak pengguna. Tunggu beberapa menit lalu coba lagi.",
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
