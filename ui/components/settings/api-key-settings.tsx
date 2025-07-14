'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ApiKeyService } from '@/lib/api/services/api-keys';
import { ApiKey, CreateApiKey, UpdateApiKey } from '@/lib/api/schemas/api-keys';

export function ApiKeySettings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState<{ [key: string]: boolean }>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyUserId, setNewKeyUserId] = useState('default-user');
  const [newKeyOrgId, setNewKeyOrgId] = useState('default-org');
  const [newKeyExpires, setNewKeyExpires] = useState('');
  const [newKeyActive, setNewKeyActive] = useState(true);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const data = await ApiKeyService.listApiKeys();
      setApiKeys(data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please provide a name for the API key');
      return;
    }

    setIsLoading(true);
    try {
      const createRequest: CreateApiKey = {
        name: newKeyName,
        user_id: newKeyUserId,
        organization_id: newKeyOrgId,
        is_active: newKeyActive,
      };

      if (newKeyExpires) {
        createRequest.expires_at = new Date(newKeyExpires).toISOString();
      }

      const newKey = await ApiKeyService.createApiKey(createRequest);
      setApiKeys([...apiKeys, newKey]);
      setIsCreateDialogOpen(false);
      setNewKeyName('');
      setNewKeyExpires('');
      toast.success('API key created successfully');
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create API key');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    setIsLoading(true);
    try {
      await ApiKeyService.deleteApiKey(id);
      setApiKeys(apiKeys.filter(key => key.id !== id));
      toast.success('API key deleted successfully');
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKey(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const updateApiKeyStatus = async (id: string, isActive: boolean) => {
    setIsLoading(true);
    try {
      const updateRequest: UpdateApiKey = { is_active: isActive };
      const updatedKey = await ApiKeyService.updateApiKey(id, updateRequest);
      setApiKeys(apiKeys.map(key => key.id === id ? updatedKey : key));
      toast.success(isActive ? 'API key activated' : 'API key deactivated');
    } catch (error) {
      console.error('Error updating API key:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update API key');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Key Management
            </CardTitle>
            <CardDescription>
              Create and manage API keys for authentication when enable_authentication is set
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="key-name">Name</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Enter API key name"
                  />
                </div>
                <div>
                  <Label htmlFor="user-id">User ID</Label>
                  <Input
                    id="user-id"
                    value={newKeyUserId}
                    onChange={(e) => setNewKeyUserId(e.target.value)}
                    placeholder="Enter user ID"
                  />
                </div>
                <div>
                  <Label htmlFor="org-id">Organization ID</Label>
                  <Input
                    id="org-id"
                    value={newKeyOrgId}
                    onChange={(e) => setNewKeyOrgId(e.target.value)}
                    placeholder="Enter organization ID"
                  />
                </div>
                <div>
                  <Label htmlFor="expires-at">Expires At (optional)</Label>
                  <Input
                    id="expires-at"
                    type="datetime-local"
                    value={newKeyExpires}
                    onChange={(e) => setNewKeyExpires(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newKeyActive}
                    onCheckedChange={setNewKeyActive}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createApiKey} disabled={isLoading}>
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && apiKeys.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading API keys...
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No API keys found</p>
            <p className="text-sm">Create your first API key to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{apiKey.name}</h4>
                        <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                          {apiKey.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {isExpired(apiKey.expires_at) && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">User ID:</span> {apiKey.user_id}
                        </div>
                        <div>
                          <span className="font-medium">Organization:</span> {apiKey.organization_id}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(apiKey.created_at)}
                        </div>
                        <div>
                          <span className="font-medium">Last Used:</span> {formatDate(apiKey.last_used_at)}
                        </div>
                        {apiKey.expires_at && (
                          <div>
                            <span className="font-medium">Expires:</span> {formatDate(apiKey.expires_at)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <div className="flex-1 font-mono text-sm bg-muted p-2 rounded border">
                          {showKey[apiKey.id] ? apiKey.key : '••••••••••••••••••••••••••••••••'}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {showKey[apiKey.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={apiKey.is_active}
                        onCheckedChange={(checked) => updateApiKeyStatus(apiKey.id, checked)}
                        disabled={isLoading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteApiKey(apiKey.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Separator className="my-6" />
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            API keys provide access to your account. Keep them secure and never share them publicly.
            These keys will be used for authentication when enable_authentication is enabled in the server configuration.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 