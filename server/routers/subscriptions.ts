import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getUserSubscription,
  createSubscription,
  hasQueriesRemaining as checkQueriesRemaining,
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

// ضع إيميلك هنا كما فعلنا في الملف السابق
const SUPER_ADMIN_EMAIL = "didofido812@gmail.com";

export const subscriptionsRouter = router({
  /**
   * Get current user's subscription status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      // استثناء للمدير الخارق
      if (ctx.user?.email === SUPER_ADMIN_EMAIL) {
        return {
          tier: "corporate", // نعطيك أعلى باقة
          queriesRemaining: 999999,
          expiryDate: new Date(2099, 11, 31), // تاريخ انتهاء في القرن القادم
          isActive: true,
        };
      }

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
   * Check if user has queries remaining
   */
  hasQueriesRemaining: protectedProcedure.query(async ({ ctx }) => {
    try {
      // استثناء للمدير الخارق لتجنب رسالة "انتهت النقاط"
      if (ctx.user?.email === SUPER_ADMIN_EMAIL) {
        return {
          hasQueries: true,
          queriesRemaining: 999999,
          tier: "corporate",
        };
      }

      const hasQueries = await checkQueriesRemaining(ctx.user.id);
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

  // باقي الوظائف (getPricing, createPayPalOrder, capturePayment, verifyPayment, getHistory) تظل كما هي
  getPricing: publicProcedure.query(async () => {
    try {
      return getSubscriptionPricing();
    } catch (error) {
      throw new Error("Failed to get pricing information");
    }
  }),

  createPayPalOrder: protectedProcedure
    .input(z.object({ tier: z.enum(["individual", "corporate"]) }))
    .mutation(async ({ ctx, input }) => {
      // لا تحتاج للدفع إذا كنت المدير
      if (ctx.user?.email === SUPER_ADMIN_EMAIL) {
        throw new Error("You are the Super Admin, no payment needed.");
      }
      // منطق الـ PayPal القديم يكمل هنا...
      const tierInfo = SUBSCRIPTION_TIERS[input.tier];
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured");
      const order = await createPayPalOrder(clientId, clientSecret, tierInfo.price, "USD", `ABCompuMed ${tierInfo.name} Subscription`);
      return { orderId: order.id, status: order.status, approvalUrl: order.links.find((l) => l.rel === "approve")?.href };
    }),

  capturePayment: protectedProcedure
    .input(z.object({ orderId: z.string(), tier: z.enum(["individual", "corporate"]) }))
    .mutation(async ({ ctx, input }) => {
      // نفس المنطق القديم للـ PayPal...
      try {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured");
        const capture = await capturePayPalOrder(clientId, clientSecret, input.orderId);
        if (capture.status !== "COMPLETED") throw new Error("Payment capture failed");
        const transactionId = capture.purchase_units[0]?.payments?.captures[0]?.id || input.orderId;
        const result = await processPayment(ctx.user.id, input.tier as SubscriptionTier, transactionId, SUBSCRIPTION_TIERS[input.tier].price);
        if (!result.success) throw new Error(result.message);
        return { success: true, message: result.message, subscription: await getUserSubscription(ctx.user.id) };
      } catch (error) {
        throw new Error(`Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  verifyPayment: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured");
        return await verifyPayPalPayment(clientId, clientSecret, input.orderId);
      } catch (error) {
        throw new Error("Failed to verify payment");
      }
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user?.email !== SUPER_ADMIN_EMAIL && ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      return { message: "Subscription history available for admin users" };
    } catch (error) {
      throw new Error("Failed to get subscription history");
    }
  }),
});
