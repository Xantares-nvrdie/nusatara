import { GoogleGenAI } from "@google/genai";
import { Value } from "@sinclair/typebox/value";
import { type Static, status, type TSchema } from "elysia";

const DEFAULT_MODEL = "gemini-3.8-flash";
/**
 * Wall-clock budget for one call, including the SDK's automatic retries on 429/5xx.
 * Stays below the API route's `maxDuration` (60s) so we can still answer with a clean error.
 */
const REQUEST_DEADLINE_MS = 50_000;

let client: GoogleGenAI | undefined;

function getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[gemini] GEMINI_API_KEY is not set");
        throw status(503, { message: "Layanan AI belum dikonfigurasi. Hubungi admin." });
    }
    client ??= new GoogleGenAI({ apiKey });
    return client;
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

/**
 * Calls Gemini (Interactions API) with a JSON schema and returns output validated against `schema`.
 * Throws Elysia `status()` errors with user-facing messages; provider details are only logged.
 */
export async function generateStructured<T extends TSchema>({
    schema,
    systemInstruction,
    input,
    maxOutputTokens,
}: GenerateStructuredOptions<T>): Promise<Static<T>> {
    const ai = getClient();
    // A shared signal bounds all retry attempts together; the SDK's `timeout_ms` would restart per attempt.
    const deadline = AbortSignal.timeout(REQUEST_DEADLINE_MS);

    let interaction: Awaited<ReturnType<typeof ai.interactions.create>>;
    try {
        interaction = await ai.interactions.create(
            {
                model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
                // Teacher material is processed once; nothing needs to be kept server-side at Google.
                store: false,
                system_instruction: systemInstruction,
                input,
                generation_config: { thinking_level: "low", max_output_tokens: maxOutputTokens },
                response_format: {
                    type: "text",
                    mime_type: "application/json",
                    schema: toGeminiSchema(schema),
                },
            },
            { signal: deadline },
        );
    } catch (error) {
        throw toHttpError(error, deadline.aborted);
    }

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
function toHttpError(error: unknown, timedOut: boolean) {
    const err = (error ?? {}) as ProviderError;
    const httpStatus =
        typeof err.statusCode === "number" ? err.statusCode : typeof err.status === "number" ? err.status : undefined;
    const body = typeof err.body === "string" ? err.body : "";
    console.error(
        `[gemini] Request failed (${String(err.name ?? "Error")}, status ${httpStatus ?? "n/a"}): ${providerMessage(body) ?? err.message}`,
    );

    if (timedOut) {
        return status(504, { message: "AI terlalu lama merespons. Coba lagi atau persingkat materi." });
    }
    if (httpStatus === 429) {
        return status(429, { message: "Kuota AI sedang penuh. Tunggu sebentar lalu coba lagi." });
    }
    // An invalid key is reported as 400 with reason API_KEY_INVALID, not as 401.
    if (httpStatus === 401 || httpStatus === 403 || body.includes("API_KEY_INVALID")) {
        return status(503, { message: "Layanan AI belum dikonfigurasi dengan benar. Hubungi admin." });
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
