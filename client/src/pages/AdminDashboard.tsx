import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  Upload,
  Plus,
  Trash2,
  Eye,
  FileText,
  Globe,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type AdminTab = "documents" | "sources" | "analytics" | "settings";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("documents");
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceType, setNewSourceType] = useState("forum");
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const documentsQuery = trpc.documents.list.useQuery({});
  const sourcesQuery = trpc.admin.getSources.useQuery();

  // Mutations
  const addSourceMutation = trpc.admin.addSource.useMutation();
  const toggleSourceMutation = trpc.admin.toggleSource.useMutation();
  const deleteDocumentMutation = trpc.documents.delete.useMutation();

  // Check admin access
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="art-deco-card max-w-md">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You do not have permission to access the admin dashboard.
          </p>
          <Button className="btn-art-deco w-full">Go to Home</Button>
        </Card>
      </div>
    );
  }

  const handleAddSource = async () => {
    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      alert("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await addSourceMutation.mutateAsync({
        name: newSourceName,
        url: newSourceUrl,
        sourceType: newSourceType as any,
      });

      setNewSourceName("");
      setNewSourceUrl("");
      setNewSourceType("forum");

      // Refetch sources
      sourcesQuery.refetch();
    } catch (error) {
      alert(
        `Error adding source: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSource = async (sourceId: number, isActive: boolean) => {
    try {
      await toggleSourceMutation.mutateAsync({
        sourceId,
        isActive: !isActive,
      });
      sourcesQuery.refetch();
    } catch (error) {
      alert(
        `Error toggling source: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await deleteDocumentMutation.mutateAsync({ documentId });
      documentsQuery.refetch();
    } catch (error) {
      alert(
        `Error deleting document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-wider mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage documents, sources, and system settings
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-6 py-4 font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "documents"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="inline mr-2 h-4 w-4" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-6 py-4 font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "sources"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="inline mr-2 h-4 w-4" />
            Search Sources
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-6 py-4 font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "analytics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="inline mr-2 h-4 w-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-4 font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="inline mr-2 h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Uploaded Documents</h2>

            {documentsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documentsQuery.data?.documents.length === 0 ? (
              <Card className="art-deco-card text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No documents uploaded yet
                </p>
                <Button className="btn-art-deco">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {documentsQuery.data?.documents.map((doc) => (
                  <Card key={doc.id} className="art-deco-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2">
                          {doc.fileName}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-semibold">Type:</span>{" "}
                            {doc.documentType}
                          </div>
                          <div>
                            <span className="font-semibold">Device:</span>{" "}
                            {doc.deviceType || "N/A"}
                          </div>
                          <div>
                            <span className="font-semibold">Manufacturer:</span>{" "}
                            {doc.manufacturer || "N/A"}
                          </div>
                          <div>
                            <span className="font-semibold">Model:</span>{" "}
                            {doc.deviceModel || "N/A"}
                          </div>
                        </div>
                        {doc.ocrProcessed && (
                          <div className="mt-3">
                            <span className="inline-block bg-primary text-primary-foreground text-xs px-2 py-1">
                              OCR Processed
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(doc.s3Url, "_blank")
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === "sources" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Search Sources</h2>

            {/* Add New Source */}
            <Card className="art-deco-card mb-8">
              <h3 className="text-xl font-bold mb-4">Add New Source</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Source Name
                  </label>
                  <Input
                    placeholder="e.g., Medical Device Forum"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    className="input-art-deco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    URL
                  </label>
                  <Input
                    placeholder="https://example.com"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    className="input-art-deco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Source Type
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    className="input-art-deco w-full"
                  >
                    <option value="forum">Forum</option>
                    <option value="manual_repository">Manual Repository</option>
                    <option value="vendor_site">Vendor Site</option>
                    <option value="technical_blog">Technical Blog</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <Button
                  onClick={handleAddSource}
                  disabled={isLoading}
                  className="btn-art-deco w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Source
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Existing Sources */}
            <h3 className="text-xl font-bold mb-4">Active Sources</h3>
            {sourcesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sourcesQuery.data?.sources.length === 0 ? (
              <Card className="art-deco-card text-center py-8">
                <p className="text-muted-foreground">No sources configured yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sourcesQuery.data?.sources.map((source) => (
                  <Card key={source.id} className="art-deco-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2">
                          {source.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {source.url}
                        </p>
                        <span className="inline-block text-xs bg-card border border-primary px-2 py-1">
                          {source.sourceType}
                        </span>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant={source.isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            handleToggleSource(source.id, source.isActive)
                          }
                        >
                          {source.isActive ? "Active" : "Inactive"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Analytics</h2>
            <Card className="art-deco-card">
              <p className="text-muted-foreground">
                Analytics dashboard coming soon. Track user queries, popular
                faults, and system usage.
              </p>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Settings</h2>
            <Card className="art-deco-card">
              <h3 className="text-xl font-bold mb-4">System Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Support Email
                  </label>
                  <Input
                    value="Support@abcompumed.shop"
                    disabled
                    className="input-art-deco"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Application Name
                  </label>
                  <Input
                    value="ABCompuMed"
                    disabled
                    className="input-art-deco"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  More settings available in the Management UI
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card mt-12">
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">
            © 2024 ABCompuMed. Admin Dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
