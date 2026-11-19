import { Elysia } from "elysia";
import { PracticeModel as M } from "./model";
import { PracticeService } from "./service";

/** Public: practice is ungraded, so the answer key and explanation are part of the response. */
const practiceModule = new Elysia({ prefix: "/practice", tags: ["Practice"] }).get(
    "/",
    ({ query }) => PracticeService.list(query),
    {
        query: M.listQuery,
        response: { 200: M.listResponse },
        detail: {
            summary: "Random practice questions with answer key and explanation (public)",
            description: "For the student 'Latihan Suara' page. Nothing is stored or graded.",
        },
    },
);

export default practiceModule;
