import { Elysia, status } from "elysia";
import { auth } from "@/auth";

/**
 * Route macros:
 *   { auth: true }      -> requires a signed-in user, injects `user` and `session`
 *   { adminOnly: true } -> requires role ADMIN
 */
const betterAuthMiddleware = new Elysia({ name: "better-auth" }).mount(auth.handler).macro({
    auth: {
        async resolve({ request: { headers } }) {
            const session = await auth.api.getSession({ headers });
            if (!session) return status(401);
            return { user: session.user, session: session.session };
        },
    },
    adminOnly: {
        async resolve({ request: { headers } }) {
            const session = await auth.api.getSession({ headers });
            if (!session) return status(401);
            if ((session.user as { role?: string | null }).role !== "ADMIN") return status(403);
            return { user: session.user, session: session.session };
        },
    },
});

export default betterAuthMiddleware;
