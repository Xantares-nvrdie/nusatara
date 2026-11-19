import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import type { ProfileUpdateBody } from "./model";

const profileColumns = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt,
};

export const ProfileService = {
    async getProfile(userId: string) {
        const [found] = await db.select(profileColumns).from(user).where(eq(user.id, userId)).limit(1);
        return found ?? null;
    },

    async updateProfile(userId: string, data: ProfileUpdateBody) {
        const updateData: Partial<typeof user.$inferInsert> = {};
        if (data.name !== undefined) updateData.name = data.name.trim();
        if (data.image !== undefined) updateData.image = data.image;

        const [updated] = await db.update(user).set(updateData).where(eq(user.id, userId)).returning(profileColumns);
        return updated;
    },
};
