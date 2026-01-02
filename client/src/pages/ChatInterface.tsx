import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Upload, Search, X, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: Array<{ name: string; url: string; type: string }>;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deviceType, setDeviceType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const [dragActive, setDragActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFault = trpc.faults.analyze.useMutation();
  const searchSources = trpc.search.searchSources.useMutation();
  const uploadDocument = trpc.documents.upload.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          // Convert base64 to Buffer
          const binaryString = atob(content.split(',')[1]);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          const buffer = Buffer.from(bytes);

          const result = await uploadDocument.mutateAsync({
            fileName: file.name,
            fileType: file.type,
            fileBuffer: buffer,
            documentType: "other",
          });

          const fileObj = {
            name: file.name,
            url: result.s3Url,
            type: file.type,
          };

          setUploadedFiles((prev) => [...prev, fileObj]);

          const userMessage: Message = {
            id: Date.now().toString() + i,
            role: "user",
            content: `Uploaded file: ${file.name}`,
            timestamp: new Date(),
            attachments: [fileObj],
          };

          setMessages((prev) => [...prev, userMessage]);

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString() + i,
            role: "assistant",
            content: `✅ File "${file.name}" uploaded successfully!\n\n**File Type:** ${file.type}\n**OCR Status:** Processing...\n\nThe document has been added to your knowledge base and will be used for fault analysis.`,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString() + i,
            role: "assistant",
            content: `❌ Error uploading file: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleAnalyzeFault = async () => {
    if (!input.trim() || !deviceType || !manufacturer || !deviceModel) {
      alert("Please fill in all device information and describe the fault");
      return;
    }

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
        content: `## 🔍 Fault Analysis Results

**Root Cause:** ${result.analysis.rootCause}

**Solution:** ${result.analysis.solution}

**Parts Required:** ${result.analysis.partsRequired.length > 0 ? result.analysis.partsRequired.join(", ") : "None"}

**Estimated Repair Time:** ${result.analysis.estimatedRepairTime}

**Difficulty Level:** ${result.analysis.difficulty}

**References:** ${result.analysis.references.length > 0 ? result.analysis.references.join(", ") : "No references found"}

---

**Queries Remaining:** ${result.queriesRemaining}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Error analyzing fault: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      content: `🔎 Search: ${input}`,
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

      let content = `## 🌐 Search Results\n\n**Query:** ${result.query}\n**Sources Searched:** ${result.sourcesSearched.join(", ")}\n**Results Found:** ${result.resultsCount}\n\n`;

      if (result.results.length === 0) {
        content += "No results found. Try:\n- Adding search sources in Admin Dashboard\n- Using different keywords\n- Uploading maintenance documents";
      } else {
        result.results.forEach((r, idx) => {
          content += `### Result ${idx + 1}: ${r.title}\n`;
          content += `**URL:** [${r.url}](${r.url})\n`;
          content += `**Relevance:** ${(r.relevanceScore * 100).toFixed(0)}%\n`;
          if (r.parts.length > 0) {
            content += `**Parts:** ${r.parts.join(", ")}\n`;
          }
          if (r.warnings.length > 0) {
            content += `**⚠️ Warnings:** ${r.warnings.join(", ")}\n`;
          }
          content += "\n";
        });
      }

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
        content: `❌ Error searching sources: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      <div className="border-b border-gold/20 bg-card">
        <div className="container py-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-wider" style={{ fontFamily: "Playfair Display" }}>
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
            <Card className="border border-gold/20 p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "Playfair Display" }}>
                Device Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Device Type
                  </label>
                  <Input
                    placeholder="e.g., Ventilator, Monitor"
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="border-gold/30 focus:border-gold"
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
                    className="border-gold/30 focus:border-gold"
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
                    className="border-gold/30 focus:border-gold"
                  />
                </div>

                <div className="pt-4 border-t border-gold/20">
                  <Button
                    onClick={handleAnalyzeFault}
                    disabled={isLoading}
                    className="bg-gold hover:bg-gold/90 text-background w-full font-semibold"
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
                    disabled={isLoading || !input.trim()}
                    variant="outline"
                    className="w-full mt-3 border-gold/50 hover:border-gold hover:bg-gold/5"
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

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full mt-3 border-gold/50 hover:border-gold hover:bg-gold/5"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.tiff,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="pt-4 border-t border-gold/20">
                    <h3 className="font-semibold mb-2 text-sm">Uploaded Files ({uploadedFiles.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gold/5 rounded border border-gold/20">
                          <span className="truncate">{file.name}</span>
                          <button
                            onClick={() =>
                              setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-gold hover:text-gold/70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="border border-gold/20 h-[600px] flex flex-col p-6">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <p className="text-muted-foreground text-lg">
                        Welcome to ABCompuMed
                      </p>
                      <p className="text-muted-foreground mt-2 text-sm">
                        Enter device information and describe a fault to get AI-powered analysis
                      </p>
                      <p className="text-muted-foreground mt-2 text-sm">
                        Or upload maintenance documents and search specialized forums
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
                            ? "bg-gold text-background"
                            : "bg-card border border-gold/20"
                        }`}
                      >
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mb-2 flex gap-2 flex-wrap">
                            {msg.attachments.map((att, idx) => (
                              <div
                                key={idx}
                                className="text-xs bg-gold/10 border border-gold/30 rounded px-2 py-1 flex items-center gap-1"
                              >
                                {att.type.startsWith("image") ? (
                                  <ImageIcon className="w-3 h-3" />
                                ) : (
                                  <Upload className="w-3 h-3" />
                                )}
                                {att.name}
                              </div>
                            ))}
                          </div>
                        )}
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

              {/* Input Area with Drag & Drop */}
              <div
                className={`border-t border-gold/20 pt-4 transition-colors ${
                  dragActive ? "bg-gold/5 border-gold/50" : ""
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {dragActive && (
                  <div className="text-center mb-2 text-gold text-sm font-semibold">
                    📁 Drop files here to upload
                  </div>
                )}
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
                    className="border-gold/30 focus:border-gold flex-1"
                  />
                  <Button
                    onClick={handleAnalyzeFault}
                    disabled={isLoading || !input.trim()}
                    className="bg-gold hover:bg-gold/90 text-background"
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
      <div className="border-t border-gold/20 bg-card mt-12">
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
