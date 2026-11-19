/**
 * Main AI provider: an OpenAI-compatible Chat Completions API. Defaults to SumoPod AI
 * (https://docs.sumopod.com/guides/ai/openai-compatible-api, prepaid AI Balance in USD) running Gemini 3.5 Flash-Lite.
 * SumoPod runs a LiteLLM proxy: Gemini ids carry a `gemini/` prefix, and `response_format` / `reasoning_effort`
 * are translated to Gemini's structured output and thinking level.
 * Other OpenAI-compatible services work by changing AI_GATEWAY_BASE_URL and AI_GATEWAY_MODELS.
 *
 * Text only (SumoPod models take text, not files), so scanned PDFs go straight to Google (see gemini.ts).
 */

const DEFAULT_BASE_URL = "https://ai.sumopod.com/v1";
/** Tried in order. Must match an id in the Models tab of the SumoPod AI page (and be allowed for the key). */
const DEFAULT_MODELS = ["gemini/gemini-3.5-flash-lite"];

export type GatewayConfig = { apiKey: string; baseUrl: string; models: string[] };

/** Null when no gateway is configured (AI_GATEWAY_API_KEY is empty). */
export function gatewayConfig(): GatewayConfig | null {
    const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
    if (!apiKey) return null;
    const models = (process.env.AI_GATEWAY_MODELS ?? DEFAULT_MODELS.join(","))
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
    if (models.length === 0) return null;
    const baseUrl = (process.env.AI_GATEWAY_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
    return { apiKey, baseUrl, models: [...new Set(models)] };
}

/**
 * LiteLLM answers an exhausted key budget or balance with 400 ("budget_exceeded"), not 402. Reported as 402 here so
 * the caller stops trying other gateway models (they share the key) and moves on to Google.
 */
const OUT_OF_CREDIT = /budget_exceeded|budget has been exceeded|insufficient[ _](balance|credit|funds|quota)/i;
/** 400s that a plain JSON-mode retry can't fix. */
const NOT_A_PARAMETER_PROBLEM = /invalid model|model.{0,40}not (found|exist|allowed)|not allowed to access model/i;

/** Non-2xx answer. `status` and `body` match what the error helpers in gemini.ts read. */
export class ProviderHttpError extends Error {
    readonly status: number;
    constructor(
        httpStatus: number,
        readonly body: string,
    ) {
        super(errorMessageFromBody(body) ?? `HTTP ${httpStatus}`);
        this.name = "ProviderHttpError";
        this.status = httpStatus === 400 && OUT_OF_CREDIT.test(body) ? 402 : httpStatus;
    }
}

type ChatCompletion = {
    choices?: { message?: { content?: unknown }; finish_reason?: unknown }[];
};

type JsonRequest = {
    model: string;
    system: string;
    user: string;
    /** JSON Schema of the answer (Gemini subset: type/properties/required/items/enum/description). */
    schema: Record<string, unknown>;
    maxOutputTokens: number;
    signal: AbortSignal;
};

/**
 * One chat completion that answers with JSON. First asks for schema-constrained output with low reasoning
 * (like the direct Gemini call). If the model rejects those options (400), asks once more in plain JSON mode with
 * the schema in the system prompt instead.
 */
export async function chatCompletionJson(config: GatewayConfig, request: JsonRequest) {
    try {
        return await send(config, request.signal, {
            model: request.model,
            messages: messages(request.system, request.user),
            response_format: { type: "json_schema", json_schema: { name: "result", schema: request.schema } },
            reasoning_effort: "low",
            max_completion_tokens: request.maxOutputTokens,
        });
    } catch (error) {
        if (!(error instanceof ProviderHttpError) || error.status !== 400 || NOT_A_PARAMETER_PROBLEM.test(error.body)) {
            throw error;
        }
        console.warn(
            `[ai-gateway] ${request.model} rejected json_schema/reasoning_effort (${error.message}); retrying in JSON mode`,
        );
    }
    const system = `${request.system}\n\nBalas hanya dengan satu objek JSON, tanpa teks lain, yang sesuai JSON Schema berikut:\n${JSON.stringify(request.schema)}`;
    return send(config, request.signal, {
        model: request.model,
        messages: messages(system, request.user),
        response_format: { type: "json_object" },
        max_completion_tokens: request.maxOutputTokens,
    });
}

const messages = (system: string, user: string) => [
    { role: "system", content: system },
    { role: "user", content: user },
];

async function send(config: GatewayConfig, signal: AbortSignal, body: Record<string, unknown>) {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, stream: false }),
        signal,
    });
    const text = await res.text();
    if (!res.ok) throw new ProviderHttpError(res.status, text);

    let data: ChatCompletion;
    try {
        data = JSON.parse(text) as ChatCompletion;
    } catch {
        throw new Error("Chat completion response is not JSON");
    }
    const choice = data.choices?.[0];
    return {
        text: typeof choice?.message?.content === "string" ? choice.message.content : "",
        finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : undefined,
    };
}

/** `error.message` from an OpenAI-, LiteLLM- or Google-style error body (an object, or a one-item array). */
export function errorMessageFromBody(body: string): string | undefined {
    try {
        const parsed = JSON.parse(body) as unknown;
        const first = (Array.isArray(parsed) ? parsed[0] : parsed) as { error?: { message?: unknown } } | undefined;
        return typeof first?.error?.message === "string" ? first.error.message : undefined;
    } catch {
        return undefined;
    }
}
