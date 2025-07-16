'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Globe, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { nostrAuth, NostrUser } from '@/lib/api/services/nostr-auth';

interface NostrLoginProps {
  onLogin?: (user: NostrUser) => void;
  onError?: (error: string) => void;
  autoRedirect?: boolean;
}

export function NostrLogin({ onLogin, onError, autoRedirect = true }: NostrLoginProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<NostrUser | null>(null);
  const [hasExtension, setHasExtension] = useState(false);
  const [redirectCounter, setRedirectCounter] = useState(3);
  const [permissionStatus, setPermissionStatus] = useState<{
    hasGetPublicKey: boolean;
    hasSignEvent: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    // Initialize nostr auth
    nostrAuth.initialize({
      onAuth: (user) => {
        setCurrentUser(user);
        setSuccess(`Logged in as ${user.npub.substring(0, 16)}...`);
        onLogin?.(user);
      },
      onLogout: () => {
        setCurrentUser(null);
        setSuccess(null);
        setError(null);
        setRedirectCounter(3);
        setPermissionStatus(null);
      }
    });

    // Check for existing auth
    const user = nostrAuth.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }

    // Check for browser extension (but don't trigger permission requests)
    const extensionAvailable = !!window.nostr;
    setHasExtension(extensionAvailable);

    // Listen for auth changes
    const unsubscribe = nostrAuth.onAuthChange((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, [onLogin]);

  const checkPermissions = async () => {
    try {
      const status = await nostrAuth.checkExtensionPermissions();
      setPermissionStatus(status);
    } catch (err) {
      console.error('Failed to check permissions:', err);
    }
  };

  // Auto-redirect countdown when user is logged in
  useEffect(() => {
    if (currentUser && autoRedirect && redirectCounter > 0) {
      const timer = setTimeout(() => {
        if (redirectCounter === 1) {
          router.push('/');
        } else {
          setRedirectCounter(prev => prev - 1);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentUser, autoRedirect, redirectCounter, router]);

  const handleManualRedirect = () => {
    router.push('/');
  };

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await nostrAuth.loginWithExtension();
      // Refresh permission status after successful login
      await checkPermissions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Extension login failed';
      setError(errorMessage);
      onError?.(errorMessage);
      // Also refresh permission status after failed attempt to show current state
      await checkPermissions();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmberLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await nostrAuth.loginWithAmber();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Amber login failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  // If already logged in, show user info
  if (currentUser) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Connected
          </CardTitle>
          <CardDescription>
            You are logged in to Nostr
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Public Key (npub)</Label>
            <div className="flex items-center gap-2">
              <Input 
                value={currentUser.npub} 
                readOnly 
                className="text-sm font-mono"
              />
              <Badge variant="secondary" className="capitalize">
                {currentUser.method}
              </Badge>
            </div>
          </div>

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {autoRedirect && redirectCounter > 0 && (
            <Alert>
              <ArrowRight className="h-4 w-4" />
              <AlertDescription>
                Redirecting to dashboard in {redirectCounter} second{redirectCounter !== 1 ? 's' : ''}...
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleManualRedirect}
            className="w-full"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Connect to Nostr</CardTitle>
        <CardDescription>
          Choose your preferred method to authenticate with Nostr
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="extension" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="extension" disabled={!hasExtension}>
              <Globe className="h-4 w-4" />
              Extension
            </TabsTrigger>
            <TabsTrigger value="amber">
              <Smartphone className="h-4 w-4" />
              Remote Signer
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="extension" className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect using a browser extension like Alby, nos2x, or similar.
              </div>
              {!hasExtension && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No Nostr extension detected. Please install a Nostr extension first.
                  </AlertDescription>
                </Alert>
              )}
              {hasExtension && permissionStatus && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Current permissions:</strong>
                    <br />• getPublicKey: {permissionStatus.hasGetPublicKey ? '✅ Granted' : '❌ Not granted'}
                    <br />• signEvent (kind 27235): {permissionStatus.hasSignEvent ? '✅ Granted' : '❌ Not granted'}
                    {(!permissionStatus.hasGetPublicKey || !permissionStatus.hasSignEvent) && (
                      <><br /><br /><strong>Missing permissions will be requested during login.</strong></>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {hasExtension && !permissionStatus && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Required permissions:</strong>
                    <br />• getPublicKey (always)
                    <br />• signEvent (kind: 27235)
                    <br />Please allow both permissions when prompted.
                  </AlertDescription>
                </Alert>
              )}
              <Button 
                onClick={handleExtensionLogin}
                disabled={isLoading || !hasExtension}
                className="w-full"
              >
                {isLoading ? 'Requesting permissions...' : 'Connect with Extension'}
              </Button>
            </TabsContent>

            <TabsContent value="amber" className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect using NIP-46 remote signing with Amber or compatible signers.
              </div>
                              <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This uses NIP-46 &quot;Direct connection initiated by the client&quot; protocol. 
                    Make sure your signer supports NIP-46 remote signing.
                  </AlertDescription>
                </Alert>
              <Button 
                onClick={handleAmberLogin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Generating Connection...' : 'Connect with NIP-46 Signer'}
              </Button>
            </TabsContent>



          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
} 