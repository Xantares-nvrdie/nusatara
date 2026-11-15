import { Elysia } from "elysia";
import betterAuthMiddleware from "@/backend/utils/better-auth/middleware";
import { ProfileModel } from "./model";
import { ProfileService } from "./service";

// Example module: index (routes) -> model (validation) -> service (db logic).
const profileModule = new Elysia({ prefix: "/profile", tags: ["Profile"] })
    .use(betterAuthMiddleware)
    .get(
        "/",
        async ({ user, set }) => {
            const profile = await ProfileService.getProfile(user.id);
            if (!profile) {
                set.status = 404;
                return { message: "User not found" };
            }
            return profile;
        },
        { auth: true, detail: { summary: "Get current user profile" } },
    )
    .patch("/", async ({ user, body }) => ProfileService.updateProfile(user.id, body), {
        auth: true,
        body: ProfileModel.updateBody,
        detail: { summary: "Update current user profile" },
    });

export default profileModule;
