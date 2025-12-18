import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  searchAllSources,
  extractMaintenanceInfo,
  addSearchSource,
  getSearchSources,
  toggleSearchSource,
} from "../web-scraper";

export const searchRouter = router({
  /**
   * Search all configured sources for fault solutions
   */
  searchSources: protectedProcedure
    .input(
      z.object({
        query: z.string().min(3),
        deviceType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const searchQuery = `${input.deviceType || ""} ${input.query}`.trim();

        const results = await searchAllSources(searchQuery);

        // Extract maintenance information from results
        const extractedInfo = results.results.map((result) => ({
          ...result,
          maintenanceInfo: extractMaintenanceInfo(result.content),
        }));

        return {
          success: true,
          query: input.query,
          resultsCount: extractedInfo.length,
          sourcesSearched: results.sourcesSearched,
          results: extractedInfo.map((r) => ({
            title: r.title,
            url: r.url,
            relevanceScore: r.relevanceScore,
            parts: r.maintenanceInfo.parts,
            procedures: r.maintenanceInfo.procedures,
            warnings: r.maintenanceInfo.warnings,
          })),
        };
      } catch (error) {
        console.error("Search error:", error);
        throw new Error(
          `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get all search sources (admin only)
   */
  getSources: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Check if user is admin
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }

      const sources = await getSearchSources();

      return {
        sources: sources.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          sourceType: s.sourceType,
          isActive: s.isActive,
        })),
      };
    } catch (error) {
      console.error("Get sources error:", error);
      throw new Error(
        `Failed to retrieve sources: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }),

  /**
   * Add a new search source (admin only)
   */
  addSource: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        url: z.string().url(),
        sourceType: z.enum([
          "forum",
          "manual_repository",
          "vendor_site",
          "technical_blog",
          "other",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is admin
        if (ctx.user?.role !== "admin") {
          throw new Error("Admin access required");
        }

        const sourceId = await addSearchSource(
          input.name,
          input.url,
          input.sourceType,
          ctx.user.id
        );

        return {
          success: true,
          sourceId,
          message: `Source "${input.name}" added successfully`,
        };
      } catch (error) {
        console.error("Add source error:", error);
        throw new Error(
          `Failed to add source: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Toggle search source active status (admin only)
   */
  toggleSource: protectedProcedure
    .input(
      z.object({
        sourceId: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is admin
        if (ctx.user?.role !== "admin") {
          throw new Error("Admin access required");
        }

        await toggleSearchSource(input.sourceId, input.isActive);

        return {
          success: true,
          message: `Source ${input.isActive ? "activated" : "deactivated"}`,
        };
      } catch (error) {
        console.error("Toggle source error:", error);
        throw new Error(
          `Failed to toggle source: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
