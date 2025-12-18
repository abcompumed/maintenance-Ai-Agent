import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getUserSubscription,
  createSubscription,
  hasQueriesRemaining,
  getSubscriptionPricing,
  processPayment,
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
} from "../subscription-manager";
import {
  createPayPalOrder,
  capturePayPalOrder,
  verifyPayPalPayment,
} from "../paypal-integration";

export const subscriptionsRouter = router({
  /**
   * Get current user's subscription status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const subscription = await getUserSubscription(ctx.user.id);

      return {
        tier: subscription.tier,
        queriesRemaining: subscription.queriesRemaining,
        expiryDate: subscription.expiryDate,
        isActive: subscription.isActive,
      };
    } catch (error) {
      console.error("Subscription status error:", error);
      throw new Error("Failed to get subscription status");
    }
  }),

  /**
   * Get subscription pricing information
   */
  getPricing: publicProcedure.query(async () => {
    try {
      return getSubscriptionPricing();
    } catch (error) {
      console.error("Pricing error:", error);
      throw new Error("Failed to get pricing information");
    }
  }),

  /**
   * Create PayPal order for subscription
   */
  createPayPalOrder: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["individual", "corporate"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tierInfo = SUBSCRIPTION_TIERS[input.tier];

        // Get PayPal credentials from environment
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          throw new Error("PayPal credentials not configured");
        }

        // Create PayPal order
        const order = await createPayPalOrder(
          clientId,
          clientSecret,
          tierInfo.price,
          "USD",
          `ABCompuMed ${tierInfo.name} Subscription`
        );

        return {
          orderId: order.id,
          status: order.status,
          approvalUrl: order.links.find((l) => l.rel === "approve")?.href,
        };
      } catch (error) {
        console.error("PayPal order creation error:", error);
        throw new Error(
          `Failed to create payment order: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Capture PayPal payment and create subscription
   */
  capturePayment: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        tier: z.enum(["individual", "corporate"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          throw new Error("PayPal credentials not configured");
        }

        // Capture the payment
        const capture = await capturePayPalOrder(
          clientId,
          clientSecret,
          input.orderId
        );

        if (capture.status !== "COMPLETED") {
          throw new Error("Payment capture failed");
        }

        // Extract transaction ID
        const transactionId =
          capture.purchase_units[0]?.payments?.captures[0]?.id ||
          input.orderId;

        // Create subscription
        const result = await processPayment(
          ctx.user.id,
          input.tier as SubscriptionTier,
          transactionId,
          SUBSCRIPTION_TIERS[input.tier].price
        );

        if (!result.success) {
          throw new Error(result.message);
        }

        return {
          success: true,
          message: result.message,
          subscription: await getUserSubscription(ctx.user.id),
        };
      } catch (error) {
        console.error("Payment capture error:", error);
        throw new Error(
          `Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Verify PayPal payment status
   */
  verifyPayment: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          throw new Error("PayPal credentials not configured");
        }

        const verification = await verifyPayPalPayment(
          clientId,
          clientSecret,
          input.orderId
        );

        return verification;
      } catch (error) {
        console.error("Payment verification error:", error);
        throw new Error("Failed to verify payment");
      }
    }),

  /**
   * Check if user has queries remaining
   */
  hasQueriesRemaining: protectedProcedure.query(async ({ ctx }) => {
    try {
      const hasQueries = await hasQueriesRemaining(ctx.user.id);
      const subscription = await getUserSubscription(ctx.user.id);

      return {
        hasQueries,
        queriesRemaining: subscription.queriesRemaining,
        tier: subscription.tier,
      };
    } catch (error) {
      console.error("Query check error:", error);
      throw new Error("Failed to check query status");
    }
  }),

  /**
   * Get subscription history (admin only)
   */
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }

      // This would query subscription history from database
      // For now, return a placeholder
      return {
        message: "Subscription history available for admin users",
      };
    } catch (error) {
      console.error("History error:", error);
      throw new Error("Failed to get subscription history");
    }
  }),
});
