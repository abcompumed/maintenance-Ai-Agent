import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  searchAllSources,
  extractMaintenanceInfo,
  addSearchSource,
  getSearchSources,
  toggleSearchSource,
} from "../web-scraper";

// تعريف إيميلك كمدير خارق
const SUPER_ADMIN_EMAIL = "didofido812@gmail.com";

const checkAdmin = (user: any) => {
  if (user?.email === SUPER_ADMIN_EMAIL || user?.role === "admin") return true;
  throw new Error("Admin access required for managing search sources.");
};

export const searchRouter = router({
  /**
   * Search all sources (Global Search)
   */
  searchSources: protectedProcedure
    .input(z.object({ query: z.string().min(3), deviceType: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const searchQuery = `${input.deviceType || ""} ${input.query}`.trim();
        // هنا يتم استدعاء "الغواصة" للبحث في النت والمنتديات
        const results = await searchAllSources(searchQuery);

        return {
          success: true,
          results: results.results.map((r) => ({
            title: r.title,
            url: r.url,
            relevanceScore: r.relevanceScore,
            // استخراج ذكي للمعلومات التقنية بالإنجليزية
            maintenanceInfo: extractMaintenanceInfo(r.content),
          })),
        };
      } catch (error) {
        throw new Error("Search failed to reach external forums");
      }
    }),

  /**
   * Manage Sources (Admin Only)
   */
  getSources: protectedProcedure.query(async ({ ctx }) => {
    checkAdmin(ctx.user);
    const sources = await getSearchSources();
    return { sources };
  }),

  addSource: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      url: z.string().url(),
      sourceType: z.enum(["forum", "manual_repository", "vendor_site", "technical_blog", "other"]),
    }))
    .mutation(async ({ ctx, input }) => {
      checkAdmin(ctx.user);
      const sourceId = await addSearchSource(input.name, input.url, input.sourceType, ctx.user.id);
      return { success: true, sourceId };
    }),

  toggleSource: protectedProcedure
    .input(z.object({ sourceId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      checkAdmin(ctx.user);
      await toggleSearchSource(input.sourceId, input.isActive);
      return { success: true };
    }),
});
