import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Pricing() {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<"individual" | "corporate" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pricingQuery = trpc.subscriptions.getPricing.useQuery();
  const createOrderMutation = trpc.subscriptions.createPayPalOrder.useMutation();

  const handleSubscribe = async (tier: "individual" | "corporate") => {
    if (!user) {
      alert("Please log in to subscribe");
      return;
    }

    setSelectedTier(tier);
    setIsProcessing(true);

    try {
      const result = await createOrderMutation.mutateAsync({ tier });

      if (result.approvalUrl) {
        // Redirect to PayPal approval
        window.location.href = result.approvalUrl;
      }
    } catch (error) {
      alert(
        `Error creating payment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsProcessing(false);
    }
  };

  if (pricingQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pricing = pricingQuery.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-wider mb-4">
            Pricing Plans
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Choose the perfect plan for your medical device maintenance needs
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <Card className="art-deco-card flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{pricing?.free.name}</h2>
              <p className="text-muted-foreground">{pricing?.free.description}</p>
            </div>

            <div className="text-4xl font-bold mb-6">
              Free
              <span className="text-lg text-muted-foreground ml-2">forever</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {pricing?.free.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <Check className="h-5 w-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button className="btn-art-deco w-full" disabled>
              Current Plan
            </Button>
          </Card>

          {/* Individual Tier */}
          <Card className="art-deco-card flex flex-col border-primary border-2">
            <div className="mb-6">
              <div className="inline-block bg-primary text-primary-foreground px-3 py-1 text-sm font-bold mb-3">
                POPULAR
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {pricing?.individual.name}
              </h2>
              <p className="text-muted-foreground">
                {pricing?.individual.description}
              </p>
            </div>

            <div className="text-4xl font-bold mb-2">
              ${pricing?.individual.price}
              <span className="text-lg text-muted-foreground ml-2">per 10 queries</span>
            </div>
            <p className="text-muted-foreground mb-6">
              Perfect for independent biomedical engineers
            </p>

            <ul className="space-y-3 mb-8 flex-1">
              {pricing?.individual.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <Check className="h-5 w-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleSubscribe("individual")}
              disabled={isProcessing && selectedTier === "individual"}
              className="btn-art-deco w-full"
            >
              {isProcessing && selectedTier === "individual" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Subscribe Now"
              )}
            </Button>
          </Card>

          {/* Corporate Tier */}
          <Card className="art-deco-card flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{pricing?.corporate.name}</h2>
              <p className="text-muted-foreground">
                {pricing?.corporate.description}
              </p>
            </div>

            <div className="text-4xl font-bold mb-2">
              ${pricing?.corporate.price}
              <span className="text-lg text-muted-foreground ml-2">per 20 queries</span>
            </div>
            <p className="text-muted-foreground mb-6">
              For hospitals and medical facilities
            </p>

            <ul className="space-y-3 mb-8 flex-1">
              {pricing?.corporate.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <Check className="h-5 w-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleSubscribe("corporate")}
              disabled={isProcessing && selectedTier === "corporate"}
              className="btn-art-deco w-full"
            >
              {isProcessing && selectedTier === "corporate" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Subscribe Now"
              )}
            </Button>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="border-t border-border bg-card">
        <div className="container py-16">
          <h2 className="text-4xl font-bold mb-12">Frequently Asked Questions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-3">Can I upgrade my plan?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade from Free to Individual or Corporate at any time.
                You'll only pay the difference.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">How are queries counted?</h3>
              <p className="text-muted-foreground">
                Each fault analysis request counts as one query. Web searches are free
                for all users.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">Do queries expire?</h3>
              <p className="text-muted-foreground">
                Queries are valid for 30 days from purchase. Unused queries will expire
                after this period.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">Is there a refund policy?</h3>
              <p className="text-muted-foreground">
                We offer a 7-day money-back guarantee if you're not satisfied with the
                service.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card">
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">
            © 2024 ABCompuMed. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Support: Support@abcompumed.shop
          </p>
        </div>
      </div>
    </div>
  );
}
