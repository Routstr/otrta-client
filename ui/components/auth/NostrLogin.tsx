'use client';

import { useEffect, useState } from 'react';
import { nostrAuth } from '@/lib/api/services/nostr-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Key, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface NostrLoginProps {
  onAuthenticated?: () => void;
}

export function NostrLogin({ onAuthenticated }: NostrLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await nostrAuth.initialize({
          theme: 'default',
          darkMode: document.documentElement.classList.contains('dark'),
          bunkers: 'nsec.app,highlighter.com,nostrsigner.com',
          perms: 'sign_event:1,sign_event:0,nip04_encrypt,nip04_decrypt',
          methods: ['connect', 'extension', 'readOnly', 'local'],
          noBanner: true,
          onAuth: (npub) => {
            console.log('Authentication successful:', npub);
            onAuthenticated?.();
          },
        });
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize nostr-login:', err);
        setError('Failed to initialize authentication system');
      }
    };

    if (typeof window !== 'undefined') {
      initializeAuth();
    }
  }, [onAuthenticated]);

  const handleLogin = async () => {
    if (!isInitialized) {
      toast.error('Authentication system not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await nostrAuth.launchAuth();
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Key className="w-12 h-12 mx-auto mb-4 text-primary" />
          <CardTitle className="text-2xl font-bold">Welcome to OTRTA</CardTitle>
          <p className="text-muted-foreground">
            Sign in with your Nostr identity to access the platform
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Authentication methods supported:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Browser extensions (Alby, nos2x, etc.)</li>
              <li>• NIP-46 Connect (nsec.app, highlighter.com)</li>
              <li>• Manual nsec input</li>
              <li>• Read-only access</li>
            </ul>
          </div>
          
          <Button
            onClick={handleLogin}
            disabled={isLoading || !isInitialized}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Sign In with Nostr'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 