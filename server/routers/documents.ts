import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { documents } from "../../drizzle/schema";
import { eq, and, or } from "drizzle-orm";
import {
  processDocument,
  classifyDeviceInfo,
  sanitizeText,
} from "../document-processor";

// تعريف إيميلك كمدير خارق
const SUPER_ADMIN_EMAIL = "didofido812@gmail.com";

export const documentsRouter = router({
  /**
   * Upload and process a document (Enhanced for Tech Files)
   */
  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.string(),
        fileBuffer: z.any(), // Changed to any for flexibility with mobile uploads
        documentType: z.enum(["manual", "catalog", "schematic", "troubleshooting", "other"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // نستخدم Buffer من input.fileBuffer مباشرة
        const buffer = Buffer.from(input.fileBuffer);

        // Process document with OCR if it's an image or non-original PDF
        const extracted = await processDocument(buffer, input.fileName, input.fileType);

        // تحسين تصنيف الجهاز (بما أن ملفاتك إنجليزية تقنية)
        const deviceInfo = classifyDeviceInfo(extracted.text);
        const sanitizedText = sanitizeText(extracted.text);

        const fileKey = `documents/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url: s3Url } = await storagePut(fileKey, buffer, input.fileType);

        const result = await db.insert(documents).values({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: buffer.length,
          s3Key: fileKey,
          s3Url: s3Url,
          extractedText: sanitizedText,
          ocrProcessed: extracted.metadata.fileType === "image" || input.fileType.includes("image"),
          documentType: input.documentType,
          deviceType: deviceInfo.deviceType || "Medical Device",
          manufacturer: deviceInfo.manufacturer || "Unknown Vendor",
          deviceModel: deviceInfo.model || "General",
        });

        return { success: true, documentId: result[0].insertId, deviceInfo };
      } catch (error) {
        throw new Error(`Upload failed: ${error instanceof Error ? error.message : "Internal Error"}`);
      }
    }),

  /**
   * List documents (Admin can see EVERYTHING)
   */
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const isSuperAdmin = ctx.user?.email === SUPER_ADMIN_EMAIL;
      
      // إذا كنت أنت، لا نضع شرط الـ userId لنرى كل الملفات المرفوعة
      const query = db.select().from(documents);
      if (!isSuperAdmin) {
        query.where(eq(documents.userId, ctx.user.id));
      }

      const docs = await query.orderBy(documents.createdAt).limit(input.limit).offset(input.offset);
      return { documents: docs };
    }),

  /**
   * Delete document (Super Admin can delete any file)
   */
  delete: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const isSuperAdmin = ctx.user?.email === SUPER_ADMIN_EMAIL;

      const condition = isSuperAdmin 
        ? eq(documents.id, input.documentId) 
        : and(eq(documents.id, input.documentId), eq(documents.userId, ctx.user.id));

      await db.delete(documents).where(condition);
      return { success: true };
    }),
});
