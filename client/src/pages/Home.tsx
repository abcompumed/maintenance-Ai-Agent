import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { ArrowRight, Brain, FileUp, Search, Shield, Zap } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleChatClick = () => {
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  const handlePricingClick = () => {
    navigate("/pricing");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-gold/20 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold/70 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-background" />
            </div>
            <span className="text-2xl font-bold text-gold" style={{ fontFamily: "Playfair Display" }}>
              ABCompuMed
            </span>
          </div>
          <div className="flex gap-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/chat")}
                  className="border-gold/50 hover:border-gold"
                >
                  Chat
                </Button>
                {user?.role === "admin" && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/admin")}
                    className="border-gold/50 hover:border-gold"
                  >
                    Admin
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-gold hover:bg-gold/90 text-background"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block mb-6 px-4 py-2 border border-gold/30 rounded-full">
              <span className="text-gold text-sm font-semibold">AI-Powered Medical Device Maintenance</span>
            </div>

            <h1
              className="text-5xl md:text-6xl font-bold mb-6 text-foreground"
              style={{ fontFamily: "Playfair Display" }}
            >
              Intelligent Fault Analysis for Medical Devices
            </h1>

            <p className="text-xl text-foreground/70 mb-8 leading-relaxed">
              ABCompuMed uses advanced AI to analyze device failures, search specialized forums and maintenance databases, and provide comprehensive repair solutions with a self-learning knowledge base.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleChatClick}
                className="bg-gold hover:bg-gold/90 text-background px-8 py-6 text-lg font-semibold rounded-lg"
              >
                Start Analysis <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                onClick={handlePricingClick}
                variant="outline"
                className="border-gold/50 hover:border-gold px-8 py-6 text-lg font-semibold rounded-lg"
              >
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-gold/20">
        <div className="container mx-auto px-4">
          <h2
            className="text-4xl font-bold text-center mb-16 text-foreground"
            style={{ fontFamily: "Playfair Display" }}
          >
            Powerful Features
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 border border-gold/20 rounded-lg hover:border-gold/40 transition-colors bg-background/50 backdrop-blur">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                AI Fault Analysis
              </h3>
              <p className="text-foreground/70">
                Advanced LLM-powered analysis identifies root causes, provides step-by-step repair procedures, and assesses repair difficulty.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 border border-gold/20 rounded-lg hover:border-gold/40 transition-colors bg-background/50 backdrop-blur">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                <FileUp className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                Document Processing
              </h3>
              <p className="text-foreground/70">
                Upload maintenance manuals, service catalogs, and technical documents. Automatic OCR extraction and device classification.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 border border-gold/20 rounded-lg hover:border-gold/40 transition-colors bg-background/50 backdrop-blur">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                Web Research
              </h3>
              <p className="text-foreground/70">
                Intelligent search across specialized forums, vendor sites, and technical blogs to find the best repair solutions.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 border border-gold/20 rounded-lg hover:border-gold/40 transition-colors bg-background/50 backdrop-blur">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                Self-Learning Database
              </h3>
              <p className="text-foreground/70">
                Automatically builds and improves knowledge base from discovered faults, linking related issues by specifications.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 border border-gold/20 rounded-lg hover:border-gold/40 transition-colors bg-background/50 backdrop-blur">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                Privacy & Security
              </h3>
              <p className="text-foreground/70">
                Respects website terms, complies with robots.txt, protects user data with encryption and secure storage.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 border border-gold/20 rounded-lg hover:border-gold/40 transition-colors bg-background/50 backdrop-blur">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                Admin Dashboard
              </h3>
              <p className="text-foreground/70">
                Manage uploaded documents, configure search sources, view analytics, and monitor system performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 border-t border-gold/20 bg-background/50">
        <div className="container mx-auto px-4">
          <h2
            className="text-4xl font-bold text-center mb-16 text-foreground"
            style={{ fontFamily: "Playfair Display" }}
          >
            Simple, Transparent Pricing
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 border border-gold/20 rounded-lg bg-background">
              <h3 className="text-2xl font-bold mb-2 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                Free
              </h3>
              <p className="text-gold font-semibold mb-6">10 queries/month</p>
              <ul className="space-y-3 mb-8 text-foreground/70">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  AI Fault Analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  Document Upload
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  Web Search
                </li>
              </ul>
              <Button
                onClick={handleChatClick}
                variant="outline"
                className="w-full border-gold/50 hover:border-gold"
              >
                Get Started
              </Button>
            </div>

            {/* Individual Tier */}
            <div className="p-8 border-2 border-gold rounded-lg bg-background relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-background text-sm font-bold rounded-full">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                Individual
              </h3>
              <p className="text-gold font-semibold mb-6">$10 per 10 queries</p>
              <ul className="space-y-3 mb-8 text-foreground/70">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  Everything in Free
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  Priority Support
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  Advanced Analytics
                </li>
              </ul>
              <Button
                onClick={handlePricingClick}
                className="w-full bg-gold hover:bg-gold/90 text-background font-semibold"
              >
                Subscribe Now
              </Button>
            </div>

            {/* Corporate Tier */}
            <div className="p-8 border border-gold/20 rounded-lg bg-background">
              <h3 className="text-2xl font-bold mb-2 text-foreground" style={{ fontFamily: "Playfair Display" }}>
                Corporate
              </h3>
              <p className="text-gold font-semibold mb-6">$35 per 20 queries</p>
              <ul className="space-y-3 mb-8 text-foreground/70">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  Everything in Individual
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  Dedicated Support
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                  Custom Integration
                </li>
              </ul>
              <Button
                onClick={handlePricingClick}
                variant="outline"
                className="w-full border-gold/50 hover:border-gold"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-gold/20">
        <div className="container mx-auto px-4 text-center">
          <h2
            className="text-4xl font-bold mb-6 text-foreground"
            style={{ fontFamily: "Playfair Display" }}
          >
            Ready to Troubleshoot?
          </h2>
          <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
            Start analyzing medical device faults with AI-powered insights. No credit card required for the free tier.
          </p>
          <Button
            onClick={handleChatClick}
            className="bg-gold hover:bg-gold/90 text-background px-8 py-6 text-lg font-semibold rounded-lg"
          >
            Start Now <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold/20 bg-background/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-gold to-gold/70 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-background" />
                </div>
                <span className="font-bold text-gold" style={{ fontFamily: "Playfair Display" }}>
                  ABCompuMed
                </span>
              </div>
              <p className="text-foreground/60 text-sm">
                AI-powered medical device maintenance assistant
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-foreground/60 text-sm">
                <li>
                  <button onClick={handleChatClick} className="hover:text-gold transition-colors">
                    Chat
                  </button>
                </li>
                <li>
                  <button onClick={handlePricingClick} className="hover:text-gold transition-colors">
                    Pricing
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-foreground/60 text-sm">
                <li>
                  <a href="#" className="hover:text-gold transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gold transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-foreground/60 text-sm">
                <li>
                  <a href="mailto:Support@abcompumed.shop" className="hover:text-gold transition-colors">
                    Support@abcompumed.shop
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gold/20 pt-8 text-center text-foreground/60 text-sm">
            <p>&copy; 2024 ABCompuMed. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
