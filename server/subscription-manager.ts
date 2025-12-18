import { getDb } from "./db";
import { subscriptions, users } from "../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";

/**
 * Subscription tier definitions
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    queriesPerMonth: 10,
    price: 0,
    description: "10 free queries per month",
  },
  individual: {
    name: "Individual",
    queriesPerMonth: 10,
    price: 10,
    description: "10 queries for $10",
  },
  corporate: {
    name: "Corporate",
    queriesPerMonth: 20,
    price: 35,
    description: "20 queries for $35",
  },
};

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Get user's current subscription
 */
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    const userSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
           gte(subscriptions.expiryDate, new Date())
        )
      )
      .orderBy((s) => s.createdAt)
      .limit(1);

    if (userSubs.length === 0) {
      // Return free tier
      return {
        tier: "free" as SubscriptionTier,
        queriesRemaining: 10,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
      };
    }

    const sub = userSubs[0];
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      tier: sub.tier as SubscriptionTier,
      queriesRemaining: user[0]?.queriesRemaining || 0,
      expiryDate: sub.expiryDate,
      isActive: sub.paymentStatus === "completed",
      transactionId: sub.transactionId,
    };
  } catch (error) {
    console.error("Error getting subscription:", error);
    throw error;
  }
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  userId: number,
  tier: SubscriptionTier,
  transactionId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    const tierInfo = SUBSCRIPTION_TIERS[tier];
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create subscription record
    const result = await db
      .insert(subscriptions)
      .values({
        userId,
        tier: tier as any,
        queriesIncluded: tierInfo.queriesPerMonth,
        transactionId,
        paymentStatus: "completed",
        paymentMethod: "paypal",
        amount: tierInfo.price.toString() as any,
        expiryDate,
      });

    // Update user's query quota
    const usersTable = (await import("../drizzle/schema")).users;
    await db
      .update(usersTable)
      .set({
        subscriptionTier: tier,
        queriesRemaining: tierInfo.queriesPerMonth,
      })
      .where(eq(usersTable.id, userId));

    return {
      subscriptionId: result[0].insertId,
      tier,
      queriesRemaining: tierInfo.queriesPerMonth,
      expiryDate,
    };
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
}

/**
 * Check if user has queries remaining
 */
export async function hasQueriesRemaining(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) return false;

    return user[0].queriesRemaining > 0;
  } catch (error) {
    console.error("Error checking queries:", error);
    return false;
  }
}

/**
 * Deduct a query from user's quota
 */
export async function deductQuery(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length || user[0].queriesRemaining <= 0) {
      return false;
    }

    const usersTable = (await import("../drizzle/schema")).users;
    await db
      .update(usersTable)
      .set({
        queriesRemaining: Math.max(0, user[0].queriesRemaining - 1),
        totalQueriesUsed: user[0].totalQueriesUsed + 1,
      })
      .where(eq(usersTable.id, userId));

    return true;
  } catch (error) {
    console.error("Error deducting query:", error);
    return false;
  }
}

/**
 * Reset monthly quota (called by scheduled job)
 */
export async function resetMonthlyQuotas(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    const allUsers = await db.select().from(users);
    let resetCount = 0;

    for (const user of allUsers) {
      const tierInfo =
        SUBSCRIPTION_TIERS[user.subscriptionTier as SubscriptionTier] ||
        SUBSCRIPTION_TIERS.free;

      const usersTable = (await import("../drizzle/schema")).users;
      await db
        .update(usersTable)
        .set({
          queriesRemaining: tierInfo.queriesPerMonth,
        })
        .where(eq(usersTable.id, user.id));

      resetCount++;
    }

    return resetCount;
  } catch (error) {
    console.error("Error resetting quotas:", error);
    throw error;
  }
}

/**
 * Get subscription pricing information
 */
export function getSubscriptionPricing() {
  return {
    free: {
      name: SUBSCRIPTION_TIERS.free.name,
      queries: SUBSCRIPTION_TIERS.free.queriesPerMonth,
      price: SUBSCRIPTION_TIERS.free.price,
      description: SUBSCRIPTION_TIERS.free.description,
      features: [
        "10 queries per month",
        "Basic fault analysis",
        "Access to knowledge base",
        "Email support",
      ],
    },
    individual: {
      name: SUBSCRIPTION_TIERS.individual.name,
      queries: SUBSCRIPTION_TIERS.individual.queriesPerMonth,
      price: SUBSCRIPTION_TIERS.individual.price,
      description: SUBSCRIPTION_TIERS.individual.description,
      features: [
        "10 queries for $10",
        "Advanced fault analysis",
        "Web search integration",
        "Document upload (5 files)",
        "Priority support",
      ],
    },
    corporate: {
      name: SUBSCRIPTION_TIERS.corporate.name,
      queries: SUBSCRIPTION_TIERS.corporate.queriesPerMonth,
      price: SUBSCRIPTION_TIERS.corporate.price,
      description: SUBSCRIPTION_TIERS.corporate.description,
      features: [
        "20 queries for $35",
        "Full AI analysis",
        "Unlimited web search",
        "Unlimited document uploads",
        "API access",
        "Dedicated support",
        "Custom integrations",
      ],
    },
  };
}

/**
 * Validate payment and create subscription
 */
export async function processPayment(
  userId: number,
  tier: SubscriptionTier,
  transactionId: string,
  amount: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify amount matches tier
    const tierInfo = SUBSCRIPTION_TIERS[tier];
    if (tierInfo.price !== amount && tier !== "free") {
      return {
        success: false,
        message: "Payment amount does not match subscription tier",
      };
    }

    // Create subscription
    await createSubscription(userId, tier, transactionId);

    return {
      success: true,
      message: `Successfully subscribed to ${tierInfo.name} plan`,
    };
  } catch (error) {
    console.error("Payment processing error:", error);
    return {
      success: false,
      message: `Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
