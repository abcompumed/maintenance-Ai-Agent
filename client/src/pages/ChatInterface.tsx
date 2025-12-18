import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Upload, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deviceType, setDeviceType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analyzeFault = trpc.faults.analyze.useMutation();
  const searchSources = trpc.search.searchSources.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAnalyzeFault = async () => {
    if (!input.trim() || !deviceType || !manufacturer || !deviceModel) {
      alert("Please fill in all device information and describe the fault");
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call AI agent for analysis
      const result = await analyzeFault.mutateAsync({
        deviceType,
        manufacturer,
        deviceModel,
        faultDescription: input,
        saveToKnowledgeBase: true,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `## Fault Analysis Results

**Root Cause:** ${result.analysis.rootCause}

**Solution:** ${result.analysis.solution}

**Parts Required:** ${result.analysis.partsRequired.join(", ") || "None"}

**Estimated Repair Time:** ${result.analysis.estimatedRepairTime}

**Difficulty Level:** ${result.analysis.difficulty}

**References:** ${result.analysis.references.join(", ")}

**Queries Remaining:** ${result.queriesRemaining}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error analyzing fault: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!input.trim()) {
      alert("Please enter a search query");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `Search: ${input}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await searchSources.mutateAsync({
        query: input,
        deviceType: deviceType || undefined,
      });

      let content = `## Search Results\n\n**Query:** ${result.query}\n**Sources Searched:** ${result.sourcesSearched.join(", ")}\n**Results Found:** ${result.resultsCount}\n\n`;

      result.results.forEach((r, idx) => {
        content += `### Result ${idx + 1}: ${r.title}\n`;
        content += `**URL:** ${r.url}\n`;
        content += `**Relevance:** ${(r.relevanceScore * 100).toFixed(0)}%\n`;
        if (r.parts.length > 0) {
          content += `**Parts:** ${r.parts.join(", ")}\n`;
        }
        if (r.warnings.length > 0) {
          content += `**Warnings:** ${r.warnings.join(", ")}\n`;
        }
        content += "\n";
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error searching sources: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-wider">
            ABCompuMed
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            AI-Powered Medical Device Maintenance Assistant
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Device Information */}
          <div className="lg:col-span-1">
            <Card className="art-deco-card">
              <h2 className="text-2xl font-bold mb-6">Device Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Device Type
                  </label>
                  <Input
                    placeholder="e.g., Ventilator, Monitor"
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="input-art-deco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Manufacturer
                  </label>
                  <Input
                    placeholder="e.g., Siemens, GE"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="input-art-deco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Device Model
                  </label>
                  <Input
                    placeholder="e.g., Model XYZ"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="input-art-deco"
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    onClick={handleAnalyzeFault}
                    disabled={isLoading}
                    className="btn-art-deco w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Analyze Fault
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSearch}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full mt-3"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search Sources
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="art-deco-card h-[600px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <p className="text-muted-foreground text-lg">
                        Welcome to ABCompuMed
                      </p>
                      <p className="text-muted-foreground mt-2">
                        Enter device information and describe a fault to get
                        AI-powered analysis
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`animate-fadeIn ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`inline-block max-w-xs lg:max-w-md px-4 py-3 rounded ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <Streamdown>{msg.content}</Streamdown>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-border pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Describe the fault or enter search query..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !isLoading) {
                        handleAnalyzeFault();
                      }
                    }}
                    className="input-art-deco flex-1"
                  />
                  <Button
                    onClick={handleAnalyzeFault}
                    disabled={isLoading || !input.trim()}
                    className="btn-art-deco"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card mt-12">
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
