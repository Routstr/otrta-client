'use client';

import { useState } from 'react';
import { useCreateCustomProvider } from '@/lib/hooks/useProviders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AddCustomProviderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddCustomProviderForm({
  onSuccess,
  onCancel,
}: AddCustomProviderFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [useOnion, setUseOnion] = useState(false);
  const [mintInput, setMintInput] = useState('');
  const [mints, setMints] = useState<string[]>([]);

  const createCustomProvider = useCreateCustomProvider();

  // Custom URL validation function
  const isValidUrl = (urlStr: string, allowOnion: boolean = false): boolean => {
    const trimmedUrl = urlStr.trim();
    if (!trimmedUrl) return false;

    // Check if it's an onion URL
    if (trimmedUrl.includes('.onion')) {
      if (!allowOnion) return false;
      // For onion URLs, accept with or without protocol
      if (
        trimmedUrl.startsWith('http://') ||
        trimmedUrl.startsWith('https://')
      ) {
        return true;
      }
      // Accept bare onion addresses (without protocol)
      return /^[a-z0-9]{16,56}\.onion$/i.test(trimmedUrl);
    }

    // Regular URL validation - still requires protocol
    try {
      const url = new URL(trimmedUrl);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAddMint = () => {
    const trimmedMint = mintInput.trim();
    if (trimmedMint && !mints.includes(trimmedMint)) {
      setMints([...mints, trimmedMint]);
      setMintInput('');
    }
  };

  const handleRemoveMint = (mintToRemove: string) => {
    setMints(mints.filter((mint) => mint !== mintToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !url.trim()) {
      return;
    }

    // Validate URL based on onion setting
    if (!isValidUrl(url, useOnion)) {
      return;
    }

    try {
      await createCustomProvider.mutateAsync({
        name: name.trim(),
        url: url.trim(),
        mints,
        use_onion: useOnion,
      });

      // Reset form
      setName('');
      setUrl('');
      setUseOnion(false);
      setMints([]);
      setMintInput('');

      onSuccess?.();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMint();
    }
  };

  // Check if current URL is valid
  const isUrlValid = !url.trim() || isValidUrl(url, useOnion);

  return (
    <Card className='w-full max-w-2xl'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Plus className='h-5 w-5' />
          Add Custom Provider
        </CardTitle>
        <CardDescription>
          Create a custom Nostr marketplace provider for your needs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Provider Name *</Label>
            <Input
              id='name'
              type='text'
              placeholder='My Custom Provider'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='url'>Provider URL *</Label>
            <Input
              id='url'
              type={useOnion ? 'text' : 'url'}
              placeholder={
                useOnion
                  ? 'example.onion or http://example.onion'
                  : 'https://my-provider.example.com'
              }
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={!isUrlValid ? 'border-red-500' : ''}
              required
            />
            {!isUrlValid && (
              <p className='text-sm text-red-500'>
                {useOnion
                  ? 'Please enter a valid onion URL (example.onion or http://example.onion)'
                  : 'Please enter a valid HTTP or HTTPS URL'}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label>Supported Mints *</Label>
            <div className='flex gap-2'>
              <Input
                type='text'
                placeholder='Add mint URL'
                value={mintInput}
                onChange={(e) => setMintInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className='flex-1'
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleAddMint}
                disabled={!mintInput.trim()}
              >
                Add
              </Button>
            </div>
            {mints.length > 0 ? (
              <div className='mt-2 flex flex-wrap gap-2'>
                {mints.map((mint) => (
                  <Badge
                    key={mint}
                    variant='secondary'
                    className='flex items-center gap-1'
                  >
                    {mint}
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-auto p-0.5 hover:bg-transparent'
                      onClick={() => handleRemoveMint(mint)}
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className='text-sm text-red-500'>
                At least one mint URL is required
              </p>
            )}
          </div>

          <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
              <Label htmlFor='use-onion'>Use Onion Network</Label>
              <p className='text-muted-foreground text-sm'>
                Enable if this provider supports Tor/onion routing
              </p>
            </div>
            <Switch
              id='use-onion'
              checked={useOnion}
              onCheckedChange={setUseOnion}
            />
          </div>

          <div className='flex gap-3 pt-4'>
            <Button
              type='submit'
              disabled={
                !name.trim() ||
                !url.trim() ||
                !isUrlValid ||
                mints.length === 0 ||
                createCustomProvider.isPending
              }
              className='flex-1'
            >
              {createCustomProvider.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create Provider'
              )}
            </Button>
            {onCancel && (
              <Button
                type='button'
                variant='outline'
                onClick={onCancel}
                disabled={createCustomProvider.isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
