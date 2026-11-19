import { Elysia, status } from "elysia";

/**
 * Global error mapping so every failure returns `{ message }` (read by the frontend `api()` helper)
 * and internal details (SQL, stack traces) never reach the client.
 * Errors thrown with `status(...)` keep their own response.
 */
const errorHandler = new Elysia({ name: "error-handler" }).onError({ as: "global" }, ({ code, error }) => {
    switch (code) {
        case "VALIDATION":
            return status(422, {
                message: "Data yang dikirim tidak valid.",
                errors: error.all.map((issue) => ({
                    path: issue.path,
                    message: "summary" in issue && issue.summary ? issue.summary : issue.message,
                })),
            });
        case "PARSE":
            return status(400, { message: "Format body request tidak dapat dibaca." });
        case "NOT_FOUND":
            return status(404, { message: "Endpoint tidak ditemukan." });
        case "INVALID_FILE_TYPE":
            return status(415, { message: "Tipe file tidak didukung." });
        case "INTERNAL_SERVER_ERROR":
        case "UNKNOWN":
            console.error("[api] Unhandled error:", error);
            return status(500, { message: "Terjadi kesalahan pada server. Silakan coba lagi." });
        default:
            // status(...) errors arrive with their numeric HTTP code and keep their own response.
            if (typeof code === "number") return;
            // Anything else carries its own `code`, e.g. a Postgres SQLSTATE like "42P01". Without this branch
            // Elysia returned the raw driver message (SQL details) to the client as text/plain.
            console.error("[api] Unhandled error:", error);
            return status(500, { message: "Terjadi kesalahan pada server. Silakan coba lagi." });
    }
});

export default errorHandler;
