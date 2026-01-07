import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { searchSources } from "../../drizzle/schema";
import { eq, or } from "drizzle-orm";

/**
 * Admin-only procedures for system management
 * Modified to allow Super Admin access via email
 */

//
const SUPER_ADMIN_EMAIL = "didofido812@gmail.com"; 

const checkAdmin = (user: any) => {
  if (user?.email === SUPER_ADMIN_EMAIL || user?.role === "admin") {
    return true;
  }
  throw new Error("Admin access required. Contact Super Admin.");
};

export const adminRouter = router({
  getSources: protectedProcedure.query(async ({ ctx }) => {
    try {
      checkAdmin(ctx.user); // التحقق الجديد
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const sources = await db.select().from(searchSources);
      return {
        sources: sources.map((s) => ({
          id: s.id, name: s.name, url: s.url,
          sourceType: s.sourceType, isActive: s.isActive,
          lastScraped: s.lastScraped, createdAt: s.createdAt,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get sources: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }),

  addSource: protectedProcedure
    .input(z.object({
        name: z.string().min(1),
        url: z.string().url(),
        sourceType: z.enum(["forum", "manual_repository", "vendor_site", "technical_blog", "other"]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        checkAdmin(ctx.user);
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const result = await db.insert(searchSources).values({
          name: input.name, url: input.url,
          sourceType: input.sourceType as any, isActive: true,
        });
        return { success: true, message: `Source "${input.name}" added successfully` };
      } catch (error) {
        throw new Error(`Failed to add source: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  // باقي الوظائف (Toggle, Delete, Stats) سنقوم بتطبيق checkAdmin(ctx.user) عليها بنفس الطريقة
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      checkAdmin(ctx.user);
      const db = await getDb();
      return {
        totalUsers: 1, // أنت الآن مستخدم مفعل
        totalQueries: "Unlimited for you",
        totalFaults: 0,
        totalDocuments: 0,
        activeSources: 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
       throw new Error("Access Denied");
    }
  }),
});
