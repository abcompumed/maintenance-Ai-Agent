import { getDb } from "./db";
import { notifications } from "../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";

export type NotificationType =
  | "new_fault"
  | "file_added"
  | "search_failed"
  | "subscription_expiring"
  | "system_alert";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  userId?: number;
  relatedFaultId?: number;
  relatedDocumentId?: number;
  actionUrl?: string;
  isRead?: boolean;
}

/**
 * Send notification to user
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    const result = await db.insert(notifications).values({
      type: payload.type as any,
      title: payload.title,
      content: payload.message,
      userId: payload.userId,
      relatedFaultId: payload.relatedFaultId,
      relatedDocumentId: payload.relatedDocumentId,
      isRead: payload.isRead || false,
    });

    return result[0].insertId;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

/**
 * Send notification to owner (admin)
 */
export async function notifyOwner(
  title: string,
  message: string,
  type: NotificationType = "system_alert"
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    // Get admin user (owner)
    const ownerOpenId = process.env.OWNER_OPEN_ID;
    if (!ownerOpenId) {
      console.warn("Owner OpenID not configured");
      return false;
    }

    const users = (await import("../drizzle/schema")).users;
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.openId, ownerOpenId))
      .limit(1);

    if (!adminUsers.length) {
      console.warn("Admin user not found");
      return false;
    }

    await sendNotification({
      type,
      title,
      message,
      userId: adminUsers[0].id,
    });

    return true;
  } catch (error) {
    console.error("Error notifying owner:", error);
    return false;
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: number,
  unreadOnly = false
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    let query;

    if (unreadOnly) {
      query = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
    } else {
      query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));
    }

    const userNotifications = await query;

    return userNotifications;
  } catch (error) {
    console.error("Error getting notifications:", error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

/**
 * Notify on new fault discovered
 */
export async function notifyNewFault(
  faultId: number,
  deviceType: string,
  manufacturer: string,
  deviceModel: string,
  userId?: number
): Promise<void> {
  try {
    const title = `New Fault Discovered: ${deviceType}`;
    const message = `A new fault solution has been found for ${manufacturer} ${deviceModel}`;

    await notifyOwner(title, message, "new_fault");

    if (userId) {
      await sendNotification({
        type: "new_fault",
        title,
        message,
        userId,
        relatedFaultId: faultId,
        actionUrl: `/chat?faultId=${faultId}`,
      });
    }
  } catch (error) {
    console.error("Error notifying new fault:", error);
  }
}

/**
 * Notify on file upload
 */
export async function notifyFileUpload(
  documentId: number,
  fileName: string,
  userId: number
): Promise<void> {
  try {
    const title = "Document Uploaded Successfully";
    const message = `Your document "${fileName}" has been uploaded and is being processed`;

    await sendNotification({
      type: "file_added",
      title,
      message,
      userId,
      relatedDocumentId: documentId,
      actionUrl: `/admin?tab=documents`,
    });

    // Notify owner
      await notifyOwner(
      "New Document Uploaded",
      `User uploaded: ${fileName}`,
      "file_added"
    );
  } catch (error) {
    console.error("Error notifying file upload:", error);
  }
}

/**
 * Notify on search failure
 */
export async function notifySearchFailure(
  sourceName: string,
  error: string
): Promise<void> {
  try {
    const title = `Search Source Failed: ${sourceName}`;
    const message = `Failed to search ${sourceName}: ${error}`;

    await notifyOwner(title, message, "search_failed");
  } catch (err) {
    console.error("Error notifying search failure:", err);
  }
}

/**
 * Notify subscription expiring soon
 */
export async function notifySubscriptionExpiring(
  userId: number,
  daysRemaining: number
): Promise<void> {
  try {
    const title = "Subscription Expiring Soon";
    const message = `Your subscription expires in ${daysRemaining} days. Renew now to continue using ABCompuMed.`;

    await sendNotification({
      type: "subscription_expiring",
      title,
      message,
      userId,
      actionUrl: "/pricing",
    });
  } catch (error) {
    console.error("Error notifying subscription expiry:", error);
  }
}

/**
 * Clean up old notifications (older than 30 days)
 */
export async function cleanupOldNotifications(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.isRead, true),
          gte(notifications.createdAt, thirtyDaysAgo)
        )
      );

    return result[0].affectedRows || 0;
  } catch (error) {
    console.error("Error cleaning up notifications:", error);
    throw error;
  }
}
