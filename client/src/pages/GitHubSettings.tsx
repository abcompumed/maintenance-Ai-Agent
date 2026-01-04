import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Github, Check, X, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function GitHubSettings() {
  const { user } = useAuth();
  const [isSetup, setIsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    githubUsername: "",
    repositoryName: "",
    repositoryUrl: "",
    accessToken: "",
    autoCreateIssues: true,
    autoCreatePRs: true,
    syncSourceCode: true,
  });

  const getIntegration = trpc.github.getIntegration.useQuery();
  const setupIntegration = trpc.github.setupIntegration.useMutation();
  const getRepositoryInfo = trpc.github.getRepositoryInfo.useQuery(undefined, {
    enabled: isSetup,
  });
  const disconnect = trpc.github.disconnect.useMutation();

  useEffect(() => {
    if (getIntegration.data?.connected) {
      setIsSetup(true);
      setFormData((prev) => ({
        ...prev,
        githubUsername: getIntegration.data.githubUsername || "",
        repositoryName: getIntegration.data.repositoryName || "",
        repositoryUrl: getIntegration.data.repositoryUrl || "",
        autoCreateIssues: getIntegration.data.autoCreateIssues ?? true,
        autoCreatePRs: getIntegration.data.autoCreatePRs ?? true,
        syncSourceCode: getIntegration.data.syncSourceCode ?? true,
      }));
    }
  }, [getIntegration.data]);

  const handleSetup = async () => {
    if (
      !formData.githubUsername ||
      !formData.repositoryName ||
      !formData.repositoryUrl ||
      !formData.accessToken
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      await setupIntegration.mutateAsync(formData);
      alert("GitHub integration setup successfully!");
      setFormData((prev) => ({ ...prev, accessToken: "" }));
      await getIntegration.refetch();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect GitHub integration?")) return;

    setIsLoading(true);
    try {
      await disconnect.mutateAsync();
      setIsSetup(false);
      setFormData({
        githubUsername: "",
        repositoryName: "",
        repositoryUrl: "",
        accessToken: "",
        autoCreateIssues: true,
        autoCreatePRs: true,
        syncSourceCode: true,
      });
      await getIntegration.refetch();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to configure GitHub integration</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-gold/20 bg-card">
        <div className="container py-8">
          <div className="flex items-center gap-4">
            <Github className="w-8 h-8 text-gold" />
            <div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-wider" style={{ fontFamily: "Playfair Display" }}>
                GitHub Integration
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Connect ABCompuMed to your GitHub repository
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Setup Form */}
          <div className="lg:col-span-2">
            <Card className="border border-gold/20 p-8">
              <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: "Playfair Display" }}>
                {isSetup ? "Update Integration" : "Setup GitHub Integration"}
              </h2>

              <div className="space-y-6">
                {/* GitHub Username */}
                <div>
                  <label className="block text-sm font-semibold mb-2">GitHub Username/Organization</label>
                  <Input
                    placeholder="e.g., abcompumed"
                    value={formData.githubUsername}
                    onChange={(e) =>
                      setFormData({ ...formData, githubUsername: e.target.value })
                    }
                    disabled={isLoading}
                    className="border-gold/30 focus:border-gold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Your GitHub username or organization name</p>
                </div>

                {/* Repository Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Repository Name</label>
                  <Input
                    placeholder="e.g., maintenance-troubleshooter-core"
                    value={formData.repositoryName}
                    onChange={(e) =>
                      setFormData({ ...formData, repositoryName: e.target.value })
                    }
                    disabled={isLoading}
                    className="border-gold/30 focus:border-gold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">The repository where faults and solutions will be stored</p>
                </div>

                {/* Repository URL */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Repository URL</label>
                  <Input
                    placeholder="https://github.com/abcompumed/maintenance-troubleshooter-core"
                    type="url"
                    value={formData.repositoryUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, repositoryUrl: e.target.value })
                    }
                    disabled={isLoading}
                    className="border-gold/30 focus:border-gold"
                  />
                </div>

                {/* Access Token */}
                <div>
                  <label className="block text-sm font-semibold mb-2">GitHub Personal Access Token</label>
                  <Input
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) =>
                      setFormData({ ...formData, accessToken: e.target.value })
                    }
                    disabled={isLoading}
                    className="border-gold/30 focus:border-gold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                      Generate a new token
                    </a>
                    {" "}with repo and workflow permissions
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-3 pt-4 border-t border-gold/20">
                  <h3 className="font-semibold">Automation Options</h3>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCreateIssues}
                      onChange={(e) =>
                        setFormData({ ...formData, autoCreateIssues: e.target.checked })
                      }
                      disabled={isLoading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Auto-create issues for new faults</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCreatePRs}
                      onChange={(e) =>
                        setFormData({ ...formData, autoCreatePRs: e.target.checked })
                      }
                      disabled={isLoading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Auto-create pull requests for solutions</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.syncSourceCode}
                      onChange={(e) =>
                        setFormData({ ...formData, syncSourceCode: e.target.checked })
                      }
                      disabled={isLoading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Sync full source code to repository</span>
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button
                    onClick={handleSetup}
                    disabled={isLoading}
                    className="bg-gold hover:bg-gold/90 text-background flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {isSetup ? "Update" : "Setup"} Integration
                      </>
                    )}
                  </Button>

                  {isSetup && (
                    <Button
                      onClick={handleDisconnect}
                      disabled={isLoading}
                      variant="outline"
                      className="border-red-500/50 hover:border-red-500 hover:text-red-400"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Status Panel */}
          <div className="space-y-6">
            {/* Integration Status */}
            <Card className="border border-gold/20 p-6">
              <h3 className="font-bold text-lg mb-4">Integration Status</h3>

              {isSetup ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">Connected</span>
                  </div>

                  {getIntegration.data && (
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Username:</p>
                        <p className="font-mono">{getIntegration.data.githubUsername}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Repository:</p>
                        <p className="font-mono text-xs break-all">{getIntegration.data.repositoryUrl}</p>
                      </div>
                      {getIntegration.data.lastSyncedAt && (
                        <div>
                          <p className="text-muted-foreground">Last Synced:</p>
                          <p>{new Date(getIntegration.data.lastSyncedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="w-5 h-5" />
                  <span>Not connected</span>
                </div>
              )}
            </Card>

            {/* Repository Info */}
            {isSetup && getRepositoryInfo.data?.success && (
              <Card className="border border-gold/20 p-6">
                <h3 className="font-bold text-lg mb-4">Repository Info</h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name:</p>
                    <p className="font-semibold">{getRepositoryInfo.data.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stars:</p>
                    <p>{getRepositoryInfo.data.stars}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Forks:</p>
                    <p>{getRepositoryInfo.data.forks}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Default Branch:</p>
                    <p className="font-mono">{getRepositoryInfo.data.defaultBranch}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Help */}
            <Card className="border border-gold/20 p-6 bg-gold/5">
              <h3 className="font-bold text-lg mb-3">How to Get Started</h3>

              <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside">
                <li>Create a GitHub repository</li>
                <li>
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                    Generate a personal access token
                  </a>
                </li>
                <li>Fill in the form above</li>
                <li>Click "Setup Integration"</li>
                <li>Start analyzing faults - they'll automatically sync to GitHub!</li>
              </ol>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
