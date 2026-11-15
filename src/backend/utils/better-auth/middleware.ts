import { Elysia, status } from "elysia";
import { auth } from "@/auth";

/**
 * Route macros:
 *   { auth: true }         -> requires a signed-in user, injects `user` and `session`
 *   { adminOnly: true }    -> requires role ADMIN
 *   { optionalAuth: true } -> never rejects, injects `user` (null when signed out). For shared-device student routes.
 */
const betterAuthMiddleware = new Elysia({ name: "better-auth" }).mount(auth.handler).macro({
    auth: {
        async resolve({ request: { headers } }) {
            const session = await auth.api.getSession({ headers });
            if (!session) return status(401, { message: "Silakan masuk terlebih dahulu." });
            return { user: session.user, session: session.session };
        },
    },
    adminOnly: {
        async resolve({ request: { headers } }) {
            const session = await auth.api.getSession({ headers });
            if (!session) return status(401, { message: "Silakan masuk terlebih dahulu." });
            if ((session.user as { role?: string | null }).role !== "ADMIN") {
                return status(403, { message: "Akses khusus admin." });
            }
            return { user: session.user, session: session.session };
        },
    },
    optionalAuth: {
        async resolve({ request: { headers } }) {
            const session = await auth.api.getSession({ headers }).catch(() => null);
            return { user: session?.user ?? null };
        },
    },
});

export default betterAuthMiddleware;
