import { type Context, status } from "elysia";
import { auth } from "@/auth";

const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"];

const betterAuthView = (context: Context) => {
    if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
        return auth.handler(context.request);
    }
    return status(405);
};

export default betterAuthView;
