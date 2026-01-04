import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { githubIntegration, githubIssues, githubPullRequests } from "../../drizzle/schema";
import { encryptData, decryptData } from "../encryption";
import { createGitHubManager } from "../github-integration";
import { eq, and } from "drizzle-orm";

export const githubRouter = router({
  /**
   * Setup GitHub integration
   */
  setupIntegration: protectedProcedure
    .input(
      z.object({
        githubUsername: z.string().min(1),
        repositoryName: z.string().min(1),
        repositoryUrl: z.string().url(),
        accessToken: z.string().min(1),
        autoCreateIssues: z.boolean().default(true),
        autoCreatePRs: z.boolean().default(true),
        syncSourceCode: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Encrypt the access token
        const { encrypted, iv } = encryptData(input.accessToken);

        // Check if integration already exists
        const existing = await db
          .select()
          .from(githubIntegration)
          .where(eq(githubIntegration.userId, ctx.user.id))
          .limit(1);

        if (existing.length > 0) {
          // Update existing integration
          await db
            .update(githubIntegration)
            .set({
              githubUsername: input.githubUsername,
              repositoryName: input.repositoryName,
              repositoryUrl: input.repositoryUrl,
              encryptedAccessToken: encrypted,
              encryptionIv: iv,
              autoCreateIssues: input.autoCreateIssues,
              autoCreatePRs: input.autoCreatePRs,
              syncSourceCode: input.syncSourceCode,
              isActive: true,
            })
            .where(eq(githubIntegration.userId, ctx.user.id));
        } else {
          // Create new integration
          await db.insert(githubIntegration).values({
            userId: ctx.user.id,
            githubUsername: input.githubUsername,
            repositoryName: input.repositoryName,
            repositoryUrl: input.repositoryUrl,
            encryptedAccessToken: encrypted,
            encryptionIv: iv,
            autoCreateIssues: input.autoCreateIssues,
            autoCreatePRs: input.autoCreatePRs,
            syncSourceCode: input.syncSourceCode,
            isActive: true,
          });
        }

        return {
          success: true,
          message: "GitHub integration setup successfully",
        };
      } catch (error) {
        console.error("Error setting up GitHub integration:", error);
        throw new Error(
          `Failed to setup GitHub integration: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get GitHub integration status
   */
  getIntegration: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    try {
      const integration = await db
        .select()
        .from(githubIntegration)
        .where(eq(githubIntegration.userId, ctx.user.id))
        .limit(1);

      if (!integration.length) {
        return { connected: false };
      }

      const config = integration[0];
      return {
        connected: true,
        githubUsername: config.githubUsername,
        repositoryName: config.repositoryName,
        repositoryUrl: config.repositoryUrl,
        isActive: config.isActive,
        autoCreateIssues: config.autoCreateIssues,
        autoCreatePRs: config.autoCreatePRs,
        syncSourceCode: config.syncSourceCode,
        lastSyncedAt: config.lastSyncedAt,
      };
    } catch (error) {
      console.error("Error getting GitHub integration:", error);
      throw new Error(
        `Failed to get GitHub integration: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }),

  /**
   * Create a GitHub issue for a fault
   */
  createIssueForFault: protectedProcedure
    .input(
      z.object({
        faultId: z.number(),
        faultTitle: z.string(),
        faultDescription: z.string(),
        deviceType: z.string(),
        manufacturer: z.string(),
        deviceModel: z.string(),
        rootCause: z.string().optional(),
        solution: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Get GitHub integration
        const integration = await db
          .select()
          .from(githubIntegration)
          .where(eq(githubIntegration.userId, ctx.user.id))
          .limit(1);

        if (!integration.length || !integration[0].isActive) {
          throw new Error("GitHub integration not configured");
        }

        const config = integration[0];
        const manager = createGitHubManager(
          config.githubUsername,
          config.repositoryName,
          config.encryptedAccessToken,
          config.encryptionIv
        );

        // Create the issue
        const result = await manager.createFaultIssue(
          input.faultTitle,
          input.faultDescription,
          input.deviceType,
          input.manufacturer,
          input.deviceModel,
          input.rootCause,
          input.solution
        );

        // Store issue reference in database
        await db.insert(githubIssues).values({
          faultId: input.faultId,
          githubIssueNumber: result.issueNumber,
          githubIssueUrl: result.issueUrl,
          title: input.faultTitle,
          body: input.faultDescription,
          status: "open",
        });

        return {
          success: true,
          issueNumber: result.issueNumber,
          issueUrl: result.issueUrl,
        };
      } catch (error) {
        console.error("Error creating GitHub issue:", error);
        throw new Error(
          `Failed to create GitHub issue: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Create a GitHub pull request for a solution
   */
  createPRForSolution: protectedProcedure
    .input(
      z.object({
        faultId: z.number(),
        faultTitle: z.string(),
        markdownContent: z.string(),
        deviceType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Get GitHub integration
        const integration = await db
          .select()
          .from(githubIntegration)
          .where(eq(githubIntegration.userId, ctx.user.id))
          .limit(1);

        if (!integration.length || !integration[0].isActive) {
          throw new Error("GitHub integration not configured");
        }

        const config = integration[0];
        const manager = createGitHubManager(
          config.githubUsername,
          config.repositoryName,
          config.encryptedAccessToken,
          config.encryptionIv
        );

        // Create the PR
        const result = await manager.createSolutionPR(
          input.faultId,
          input.faultTitle,
          input.markdownContent,
          input.deviceType
        );

        // Store PR reference in database
        await db.insert(githubPullRequests).values({
          faultId: input.faultId,
          githubPRNumber: result.prNumber,
          githubPRUrl: result.prUrl,
          title: input.faultTitle,
          body: input.markdownContent,
          branch: result.branch,
          status: "open",
        });

        return {
          success: true,
          prNumber: result.prNumber,
          prUrl: result.prUrl,
        };
      } catch (error) {
        console.error("Error creating GitHub PR:", error);
        throw new Error(
          `Failed to create GitHub PR: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get GitHub repository information
   */
  getRepositoryInfo: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    try {
      const integration = await db
        .select()
        .from(githubIntegration)
        .where(eq(githubIntegration.userId, ctx.user.id))
        .limit(1);

      if (!integration.length) {
        throw new Error("GitHub integration not configured");
      }

      const config = integration[0];
      const manager = createGitHubManager(
        config.githubUsername,
        config.repositoryName,
        config.encryptedAccessToken,
        config.encryptionIv
      );

      const info = await manager.getRepositoryInfo();
      return info;
    } catch (error) {
      console.error("Error getting repository info:", error);
      throw new Error(
        `Failed to get repository info: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }),

  /**
   * List GitHub issues
   */
  listIssues: protectedProcedure
    .input(z.object({ state: z.enum(["open", "closed", "all"]).default("open") }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const integration = await db
          .select()
          .from(githubIntegration)
          .where(eq(githubIntegration.userId, ctx.user.id))
          .limit(1);

        if (!integration.length) {
          throw new Error("GitHub integration not configured");
        }

        const config = integration[0];
        const manager = createGitHubManager(
          config.githubUsername,
          config.repositoryName,
          config.encryptedAccessToken,
          config.encryptionIv
        );

        const result = await manager.listIssues(input.state);
        return result;
      } catch (error) {
        console.error("Error listing issues:", error);
        throw new Error(
          `Failed to list issues: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * List GitHub pull requests
   */
  listPullRequests: protectedProcedure
    .input(z.object({ state: z.enum(["open", "closed", "all"]).default("open") }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const integration = await db
          .select()
          .from(githubIntegration)
          .where(eq(githubIntegration.userId, ctx.user.id))
          .limit(1);

        if (!integration.length) {
          throw new Error("GitHub integration not configured");
        }

        const config = integration[0];
        const manager = createGitHubManager(
          config.githubUsername,
          config.repositoryName,
          config.encryptedAccessToken,
          config.encryptionIv
        );

        const result = await manager.listPullRequests(input.state);
        return result;
      } catch (error) {
        console.error("Error listing pull requests:", error);
        throw new Error(
          `Failed to list pull requests: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Search GitHub repositories for maintenance guides
   */
  searchRepositories: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        deviceType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const integration = await db
          .select()
          .from(githubIntegration)
          .where(eq(githubIntegration.userId, ctx.user.id))
          .limit(1);

        if (!integration.length) {
          throw new Error("GitHub integration not configured");
        }

        const config = integration[0];
        const manager = createGitHubManager(
          config.githubUsername,
          config.repositoryName,
          config.encryptedAccessToken,
          config.encryptionIv
        );

        const result = await manager.searchRepositories(input.query, input.deviceType);
        return result;
      } catch (error) {
        console.error("Error searching repositories:", error);
        throw new Error(
          `Failed to search repositories: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Disconnect GitHub integration
   */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    try {
      await db
        .update(githubIntegration)
        .set({ isActive: false })
        .where(eq(githubIntegration.userId, ctx.user.id));

      return { success: true, message: "GitHub integration disconnected" };
    } catch (error) {
      console.error("Error disconnecting GitHub integration:", error);
      throw new Error(
        `Failed to disconnect: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }),
});
