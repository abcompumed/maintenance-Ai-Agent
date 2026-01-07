import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { forumCredentials } from "../../drizzle/schema";
import { encryptData, decryptData } from "../encryption";
import { eq, and, or } from "drizzle-orm";

// تعريف إيميلك كمدير خارق
const SUPER_ADMIN_EMAIL = "didofido812@gmail.com";

export const forumCredentialsRouter = router({
  /**
   * Add forum credentials (Enhanced for Super Admin)
   */
  addCredential: protectedProcedure
    .input(z.object({
        forumName: z.string().min(1),
        forumUrl: z.string().url(),
        username: z.string().min(1),
        password: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      try {
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
        return { success: true, credentialId: result[0].insertId };
      } catch (error) {
        throw new Error("Failed to store credentials safely.");
      }
    }),

  /**
   * List Credentials (Super Admin can see all system-wide forum accounts)
   */
  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const isSuperAdmin = ctx.user?.email === SUPER_ADMIN_EMAIL;
    
    // إذا كنت أنت، سيعرض لك كل الحسابات المضافة في النظام
    const query = db.select().from(forumCredentials);
    if (!isSuperAdmin) {
        query.where(eq(forumCredentials.userId, ctx.user.id));
    }
    
    const creds = await query;
    return {
      credentials: creds.map((c) => ({
        id: c.id,
        forumName: c.forumName,
        forumUrl: c.forumUrl,
        username: c.username,
        isActive: c.isActive,
        lastUsed: c.lastUsed,
      })),
    };
  }),

  /**
   * Internal Use Only: Decrypt for the Scraper
   */
  getDecryptedCredential: protectedProcedure
    .input(z.object({ credentialId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const isSuperAdmin = ctx.user?.email === SUPER_ADMIN_EMAIL;

      const condition = isSuperAdmin 
        ? eq(forumCredentials.id, input.credentialId)
        : and(eq(forumCredentials.id, input.credentialId), eq(forumCredentials.userId, ctx.user.id));

      const cred = await db.select().from(forumCredentials).where(condition).limit(1);

      if (!cred.length) throw new Error("Credential not found");

      const decryptedPassword = decryptData(cred[0].encryptedPassword, cred[0].encryptionIv);
      return {
        username: cred[0].username,
        password: decryptedPassword,
        url: cred[0].forumUrl
      };
    }),

  /**
   * Delete & Update Logic (Admin Overrides)
   */
  deleteCredential: protectedProcedure
    .input(z.object({ credentialId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const isSuperAdmin = ctx.user?.email === SUPER_ADMIN_EMAIL;
      const condition = isSuperAdmin 
        ? eq(forumCredentials.id, input.credentialId)
        : and(eq(forumCredentials.id, input.credentialId), eq(forumCredentials.userId, ctx.user.id));

      await db.delete(forumCredentials).where(condition);
      return { success: true };
    }),
});
