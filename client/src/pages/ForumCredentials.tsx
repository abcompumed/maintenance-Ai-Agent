import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Eye, EyeOff, Edit2, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface Credential {
  id: number;
  forumName: string;
  forumUrl: string;
  username: string;
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
}

export default function ForumCredentials() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    forumName: "",
    forumUrl: "",
    username: "",
    password: "",
  });

  const getCredentials = trpc.forumCredentials.getCredentials.useQuery();
  const addCredential = trpc.forumCredentials.addCredential.useMutation();
  const updateCredential = trpc.forumCredentials.updateCredential.useMutation();
  const deleteCredential = trpc.forumCredentials.deleteCredential.useMutation();
  const toggleCredential = trpc.forumCredentials.toggleCredential.useMutation();

  useEffect(() => {
    if (getCredentials.data?.credentials) {
      setCredentials(
        getCredentials.data.credentials.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          lastUsed: c.lastUsed ? new Date(c.lastUsed) : undefined,
        }))
      );
    }
  }, [getCredentials.data]);

  const handleAddCredential = async () => {
    if (
      !formData.forumName ||
      !formData.forumUrl ||
      !formData.username ||
      !formData.password
    ) {
      alert("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await addCredential.mutateAsync(formData);
      setFormData({ forumName: "", forumUrl: "", username: "", password: "" });
      setShowForm(false);
      await getCredentials.refetch();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCredential = async (id: number) => {
    if (!confirm("Are you sure you want to delete this credential?")) return;

    setIsLoading(true);
    try {
      await deleteCredential.mutateAsync({ credentialId: id });
      await getCredentials.refetch();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    setIsLoading(true);
    try {
      await toggleCredential.mutateAsync({
        credentialId: id,
        isActive: !isActive,
      });
      await getCredentials.refetch();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to manage forum credentials</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-gold/20 bg-card">
        <div className="container py-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-wider" style={{ fontFamily: "Playfair Display" }}>
            Forum Credentials
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your forum login credentials for authorized searching
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Credential Form */}
          {showForm && (
            <Card className="border border-gold/20 p-6 lg:col-span-1">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "Playfair Display" }}>
                Add Forum Credential
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Forum Name</label>
                  <Input
                    placeholder="e.g., Biomedical Forum"
                    value={formData.forumName}
                    onChange={(e) =>
                      setFormData({ ...formData, forumName: e.target.value })
                    }
                    className="border-gold/30 focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Forum URL</label>
                  <Input
                    placeholder="https://forum.example.com"
                    type="url"
                    value={formData.forumUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, forumUrl: e.target.value })
                    }
                    className="border-gold/30 focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Username</label>
                  <Input
                    placeholder="Your forum username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="border-gold/30 focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Password</label>
                  <Input
                    placeholder="Your forum password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="border-gold/30 focus:border-gold"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleAddCredential}
                    disabled={isLoading}
                    className="bg-gold hover:bg-gold/90 text-background flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ forumName: "", forumUrl: "", username: "", password: "" });
                    }}
                    variant="outline"
                    className="border-gold/50 hover:border-gold flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Credentials List */}
          <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "Playfair Display" }}>
                Your Credentials ({credentials.length})
              </h2>
              {!showForm && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gold hover:bg-gold/90 text-background"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Credential
                </Button>
              )}
            </div>

            {credentials.length === 0 ? (
              <Card className="border border-gold/20 p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  No forum credentials added yet
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Add your forum credentials to enable authorized searching on maintenance forums
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {credentials.map((cred) => (
                  <Card key={cred.id} className="border border-gold/20 p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{cred.forumName}</h3>
                        <p className="text-sm text-muted-foreground">{cred.forumUrl}</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          cred.isActive
                            ? "bg-green-900/30 text-green-400"
                            : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {cred.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Username:</span>
                        <span className="font-mono">{cred.username}</span>
                      </div>
                      {cred.lastUsed && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Last Used:</span>
                          <span>{new Date(cred.lastUsed).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleToggle(cred.id, cred.isActive)}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-gold/50 hover:border-gold"
                      >
                        {cred.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        onClick={() => handleDeleteCredential(cred.id)}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 hover:border-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <Card className="border border-gold/20 p-6 mt-8 bg-gold/5">
          <h3 className="font-bold text-lg mb-2">🔒 Security Notice</h3>
          <p className="text-sm text-muted-foreground">
            Your credentials are encrypted using AES-256 encryption and stored securely. Passwords are never displayed after being saved. They are only used by our AI agent to access forums for authorized searching. We respect all forum terms of service and privacy policies.
          </p>
        </Card>
      </div>
    </div>
  );
}
