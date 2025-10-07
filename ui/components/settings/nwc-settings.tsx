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
import {
  Zap,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Wifi,
  WifiOff,
  TestTube,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { NwcService } from '@/lib/api/services/nwc';
import {
  NwcConnection,
  CreateNwcConnection,
  UpdateNwcConnection,
  NwcTestResponse,
} from '@/lib/api/schemas/nwc';

export function NwcSettings() {
  const [connections, setConnections] = useState<NwcConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConnectionUri, setShowConnectionUri] = useState<{
    [key: string]: boolean;
  }>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Create connection form state
  const [newConnectionName, setNewConnectionName] = useState('');
  const [newConnectionUri, setNewConnectionUri] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<NwcTestResponse | null>(null);

  const fetchConnections = async () => {
    try {
      const data = await NwcService.listConnections();
      setConnections(data);
    } catch (error) {
      console.error('Error fetching NWC connections:', error);
      toast.error('Failed to load NWC connections');
    }
  };

  const testConnection = async () => {
    if (!newConnectionUri.trim()) {
      toast.error('Please enter a connection URI');
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await NwcService.testConnection({
        connection_uri: newConnectionUri,
      });
      setTestResult(result);
      toast.success('Connection test successful!');
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult(null);
      toast.error('Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const createConnection = async () => {
    if (!newConnectionName.trim() || !newConnectionUri.trim()) {
      toast.error('Please provide both name and connection URI');
      return;
    }

    setIsLoading(true);
    try {
      const createRequest: CreateNwcConnection = {
        name: newConnectionName,
        connection_uri: newConnectionUri,
      };

      const newConnection = await NwcService.createConnection(createRequest);
      setConnections([...connections, newConnection]);
      setIsCreateDialogOpen(false);
      setNewConnectionName('');
      setNewConnectionUri('');
      setTestResult(null);
      toast.success('NWC connection created successfully');
    } catch (error) {
      console.error('Error creating NWC connection:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create NWC connection'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this NWC connection?'))
      return;

    setIsLoading(true);
    try {
      await NwcService.deleteConnection(id);
      setConnections(connections.filter((conn) => conn.id !== id));
      toast.success('NWC connection deleted successfully');
    } catch (error) {
      console.error('Error deleting NWC connection:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete NWC connection'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleConnectionVisibility = (id: string) => {
    setShowConnectionUri((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const updateConnectionStatus = async (id: string, isActive: boolean) => {
    setIsLoading(true);
    try {
      const updateRequest: UpdateNwcConnection = { is_active: isActive };
      const updatedConnection = await NwcService.updateConnection(
        id,
        updateRequest
      );
      setConnections(
        connections.map((conn) => (conn.id === id ? updatedConnection : conn))
      );
      toast.success(
        isActive ? 'Connection activated' : 'Connection deactivated'
      );
    } catch (error) {
      console.error('Error updating connection:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update connection'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchConnections();
      setIsLoading(false);
    };
    loadData();
  }, []);

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Zap className='h-5 w-5' />
                NWC Connections
              </CardTitle>
              <CardDescription>
                Manage Nostr Wallet Connect connections for lightning payments
              </CardDescription>
            </div>
            {connections.length === 0 && (
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Connection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create NWC Connection</DialogTitle>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <div>
                      <Label htmlFor='connection-name'>Name</Label>
                      <Input
                        id='connection-name'
                        value={newConnectionName}
                        onChange={(e) => setNewConnectionName(e.target.value)}
                        placeholder='Enter connection name'
                      />
                    </div>
                    <div>
                      <Label htmlFor='connection-uri'>Connection URI</Label>
                      <Input
                        id='connection-uri'
                        value={newConnectionUri}
                        onChange={(e) => setNewConnectionUri(e.target.value)}
                        placeholder='nostr+walletconnect://...'
                      />
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        onClick={testConnection}
                        disabled={
                          isTestingConnection || !newConnectionUri.trim()
                        }
                        className='flex-1'
                      >
                        {isTestingConnection ? (
                          <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                          <TestTube className='mr-2 h-4 w-4' />
                        )}
                        Test Connection
                      </Button>
                    </div>
                    {testResult && (
                      <Alert>
                        <Wifi className='h-4 w-4' />
                        <AlertDescription>
                          Connection successful! Methods:{' '}
                          {testResult.methods.join(', ')}
                          {testResult.alias && ` | Alias: ${testResult.alias}`}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className='flex justify-end space-x-2'>
                      <Button
                        variant='outline'
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          setTestResult(null);
                          setNewConnectionName('');
                          setNewConnectionUri('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={createConnection} disabled={isLoading}>
                        {isLoading ? (
                          <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                          <Plus className='mr-2 h-4 w-4' />
                        )}
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && connections.length === 0 ? (
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='mr-2 h-6 w-6 animate-spin' />
              Loading connections...
            </div>
          ) : connections.length === 0 ? (
            <div className='text-muted-foreground py-8 text-center'>
              <Zap className='mx-auto mb-4 h-12 w-12 opacity-50' />
              <p>No NWC connections found</p>
              <p className='text-sm'>
                Create your first connection to enable lightning payments
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {connections.map((connection) => (
                <Card
                  key={connection.id}
                  className='overflow-hidden border-l-4 border-l-yellow-500'
                >
                  <CardContent className='pt-6'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                      <div className='min-w-0 flex-1 space-y-2'>
                        <div className='space-y-2'>
                          <h4 className='truncate font-semibold'>
                            {connection.name}
                          </h4>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Badge
                              variant={
                                connection.is_active ? 'default' : 'secondary'
                              }
                            >
                              {connection.is_active ? (
                                <>
                                  <Wifi className='mr-1 h-3 w-3' />
                                  Active
                                </>
                              ) : (
                                <>
                                  <WifiOff className='mr-1 h-3 w-3' />
                                  Inactive
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>

                        <div className='text-muted-foreground grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:gap-4'>
                          <div>
                            <span className='font-medium'>Created:</span>{' '}
                            {formatDate(connection.created_at)}
                          </div>
                          <div>
                            <span className='font-medium'>Updated:</span>{' '}
                            {formatDate(connection.updated_at)}
                          </div>
                        </div>

                        <div className='mt-4 flex items-center gap-2'>
                          <div className='bg-muted flex-1 overflow-hidden rounded border p-2 font-mono text-xs sm:text-sm'>
                            <span className='break-all'>
                              {showConnectionUri[connection.id]
                                ? connection.connection_uri
                                : '••••••••••••••••••••••••••••••••'}
                            </span>
                          </div>
                          <div className='flex shrink-0 gap-1 sm:gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() =>
                                toggleConnectionVisibility(connection.id)
                              }
                              className='px-2'
                            >
                              {showConnectionUri[connection.id] ? (
                                <EyeOff className='h-4 w-4' />
                              ) : (
                                <Eye className='h-4 w-4' />
                              )}
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() =>
                                copyToClipboard(connection.connection_uri)
                              }
                              className='px-2'
                            >
                              <Copy className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-2 lg:ml-4'>
                        <div className='flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start'>
                          <div className='flex items-center gap-2'>
                            <Switch
                              checked={connection.is_active}
                              onCheckedChange={(checked) =>
                                updateConnectionStatus(connection.id, checked)
                              }
                              disabled={isLoading}
                            />
                            <span className='text-muted-foreground text-sm sm:hidden'>
                              {connection.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => deleteConnection(connection.id)}
                            disabled={isLoading}
                            className='text-destructive hover:text-destructive'
                          >
                            <Trash2 className='mr-2 h-4 w-4 sm:mr-0' />
                            <span className='sm:hidden'>Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Zap className='h-4 w-4' />
        <AlertDescription>
          NWC (Nostr Wallet Connect) allows secure lightning payments through
          Nostr protocols. Connect your wallet to enable lightning invoice
          payments.
        </AlertDescription>
      </Alert>
    </div>
  );
}
