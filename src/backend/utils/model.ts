import { t } from "elysia";

/** Shared DTOs reused across backend modules. */
export const IdParams = t.Object({ id: t.String() });
export const SlugParams = t.Object({ slug: t.String() });
