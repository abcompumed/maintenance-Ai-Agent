import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { forumCredentials } from "../../drizzle/schema";
import { encryptData, decryptData } from "../encryption";
import { eq, and } from "drizzle-orm";

export const forumCredentialsRouter = router({
  /**
   * Add forum credentials
   */
  addCredential: protectedProcedure
    .input(
      z.object({
        forumName: z.string().min(1),
        forumUrl: z.string().url(),
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Encrypt password
        const { encrypted, iv } = encryptData(input.password);

        const result = await db.insert(forumCredentials).values({
          userId: ctx.user.id,
          forumName: input.forumName,
          forumUrl: input.forumUrl,
          username: input.username,
          encryptedPassword: encrypted,
          encryptionIv: iv,
          isActive: true,
        });

        return {
          success: true,
          credentialId: result[0].insertId,
          message: `Forum credentials for "${input.forumName}" added successfully`,
        };
      } catch (error) {
        console.error("Error adding credential:", error);
        throw new Error(
          `Failed to add credential: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get user's forum credentials (passwords are not returned)
   */
  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    try {
      const creds = await db
        .select()
        .from(forumCredentials)
        .where(eq(forumCredentials.userId, ctx.user.id));

      return {
        credentials: creds.map((c) => ({
          id: c.id,
          forumName: c.forumName,
          forumUrl: c.forumUrl,
          username: c.username,
          isActive: c.isActive,
          lastUsed: c.lastUsed,
          createdAt: c.createdAt,
        })),
      };
    } catch (error) {
      console.error("Error getting credentials:", error);
      throw new Error(
        `Failed to get credentials: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }),

  /**
   * Get decrypted credential (for internal use only)
   */
  getDecryptedCredential: protectedProcedure
    .input(z.object({ credentialId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const cred = await db
          .select()
          .from(forumCredentials)
          .where(
            and(
              eq(forumCredentials.id, input.credentialId),
              eq(forumCredentials.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!cred.length) {
          throw new Error("Credential not found");
        }

        const credential = cred[0];
        const decryptedPassword = decryptData(
          credential.encryptedPassword,
          credential.encryptionIv
        );

        return {
          forumName: credential.forumName,
          forumUrl: credential.forumUrl,
          username: credential.username,
          password: decryptedPassword,
        };
      } catch (error) {
        console.error("Error getting decrypted credential:", error);
        throw new Error(
          `Failed to get credential: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Update credential
   */
  updateCredential: protectedProcedure
    .input(
      z.object({
        credentialId: z.number(),
        forumName: z.string().optional(),
        forumUrl: z.string().url().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const updateData: any = {};

        if (input.forumName) updateData.forumName = input.forumName;
        if (input.forumUrl) updateData.forumUrl = input.forumUrl;
        if (input.username) updateData.username = input.username;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        if (input.password) {
          const { encrypted, iv } = encryptData(input.password);
          updateData.encryptedPassword = encrypted;
          updateData.encryptionIv = iv;
        }

        await db
          .update(forumCredentials)
          .set(updateData)
          .where(
            and(
              eq(forumCredentials.id, input.credentialId),
              eq(forumCredentials.userId, ctx.user.id)
            )
          );

        return {
          success: true,
          message: "Credential updated successfully",
        };
      } catch (error) {
        console.error("Error updating credential:", error);
        throw new Error(
          `Failed to update credential: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Delete credential
   */
  deleteCredential: protectedProcedure
    .input(z.object({ credentialId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        await db
          .delete(forumCredentials)
          .where(
            and(
              eq(forumCredentials.id, input.credentialId),
              eq(forumCredentials.userId, ctx.user.id)
            )
          );

        return {
          success: true,
          message: "Credential deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting credential:", error);
        throw new Error(
          `Failed to delete credential: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Toggle credential active status
   */
  toggleCredential: protectedProcedure
    .input(
      z.object({
        credentialId: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        await db
          .update(forumCredentials)
          .set({ isActive: input.isActive })
          .where(
            and(
              eq(forumCredentials.id, input.credentialId),
              eq(forumCredentials.userId, ctx.user.id)
            )
          );

        return {
          success: true,
          message: `Credential ${input.isActive ? "enabled" : "disabled"} successfully`,
        };
      } catch (error) {
        console.error("Error toggling credential:", error);
        throw new Error(
          `Failed to toggle credential: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
