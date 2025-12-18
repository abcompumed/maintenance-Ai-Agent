import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { documents } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  processDocument,
  classifyDeviceInfo,
  sanitizeText,
} from "../document-processor";

export const documentsRouter = router({
  /**
   * Upload and process a document
   */
  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.string(),
        fileBuffer: z.instanceof(Buffer),
        documentType: z.enum([
          "manual",
          "catalog",
          "schematic",
          "troubleshooting",
          "other",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Process the document to extract text
        const extracted = await processDocument(
          input.fileBuffer,
          input.fileName,
          input.fileType
        );

        // Classify device information from extracted text
        const deviceInfo = classifyDeviceInfo(extracted.text);

        // Sanitize extracted text
        const sanitizedText = sanitizeText(extracted.text);

        // Upload file to S3
        const fileKey = `documents/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url: s3Url } = await storagePut(
          fileKey,
          input.fileBuffer,
          input.fileType
        );

        // Store document metadata in database
        const result = await db
          .insert(documents)
          .values({
            userId: ctx.user.id,
            fileName: input.fileName,
            fileType: input.fileType,
            fileSize: input.fileBuffer.length,
            s3Key: fileKey,
            s3Url: s3Url,
            extractedText: sanitizedText,
            ocrProcessed: extracted.metadata.fileType === "image",
            documentType: input.documentType,
            deviceType: deviceInfo.deviceType,
            manufacturer: deviceInfo.manufacturer,
            deviceModel: deviceInfo.model,
          });

        return {
          success: true,
          documentId: result[0].insertId,
          fileName: input.fileName,
          s3Url,
          deviceInfo,
          textLength: sanitizedText.length,
          ocrProcessed: extracted.metadata.fileType === "image",
        };
      } catch (error) {
        console.error("Document upload error:", error);
        throw new Error(
          `Failed to process document: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * List user's uploaded documents
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        documentType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const conditions = [eq(documents.userId, ctx.user.id)];

        if (input.documentType) {
          conditions.push(eq(documents.documentType, input.documentType as any));
        }

        const docs = await db
          .select()
          .from(documents)
          .where(and(...conditions))
          .orderBy((t: any) => t.createdAt)
          .limit(input.limit)
          .offset(input.offset);

        return {
          documents: docs.map((doc: any) => ({
            id: doc.id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            documentType: doc.documentType,
            deviceType: doc.deviceType,
            manufacturer: doc.manufacturer,
            deviceModel: doc.deviceModel,
            s3Url: doc.s3Url,
            ocrProcessed: doc.ocrProcessed,
            createdAt: doc.createdAt,
          })),
        };
      } catch (error) {
        console.error("Document list error:", error);
        throw new Error("Failed to retrieve documents");
      }
    }),

  /**
   * Get document details
   */
  get: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const docs = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.id, input.documentId),
              eq(documents.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!docs.length) {
          throw new Error("Document not found or access denied");
        }

        const doc = docs[0];
        return {
          id: doc.id,
          fileName: doc.fileName,
          fileType: doc.fileType,
          documentType: doc.documentType,
          deviceType: doc.deviceType,
          manufacturer: doc.manufacturer,
          deviceModel: doc.deviceModel,
          s3Url: doc.s3Url,
          extractedText: doc.extractedText,
          ocrProcessed: doc.ocrProcessed,
          createdAt: doc.createdAt,
        };
      } catch (error) {
        console.error("Document get error:", error);
        throw new Error("Failed to retrieve document");
      }
    }),

  /**
   * Delete a document
   */
  delete: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Verify ownership
        const docs = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.id, input.documentId),
              eq(documents.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!docs.length) {
          throw new Error("Document not found or access denied");
        }

        // Delete from database
        await db
          .delete(documents)
          .where(eq(documents.id, input.documentId));

        return { success: true };
      } catch (error) {
        console.error("Document delete error:", error);
        throw new Error("Failed to delete document");
      }
    }),
});
