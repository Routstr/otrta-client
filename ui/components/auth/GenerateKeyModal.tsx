'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Eye, EyeOff, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateNostrKey,
  type GeneratedNostrKey,
} from '@/lib/auth/key-generator';

interface GenerateKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyGenerated: (nsec: string) => void;
}

export default function GenerateKeyModal({
  open,
  onOpenChange,
  onKeyGenerated,
}: GenerateKeyModalProps) {
  const [step, setStep] = useState<'confirm' | 'display' | 'verify'>('confirm');
  const [generatedKey, setGeneratedKey] = useState<GeneratedNostrKey | null>(
    null
  );
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [confirmationChecks, setConfirmationChecks] = useState({
    understand: false,
    written: false,
    secure: false,
  });

  const handleGenerateKey = () => {
    const key = generateNostrKey();
    setGeneratedKey(key);
    setStep('display');
  };

  const handleCopyKey = async () => {
    if (!generatedKey) return;

    try {
      await navigator.clipboard.writeText(generatedKey.privateKeyNsec);
      toast.success('Private key copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleProceed = () => {
    if (!generatedKey) return;
    onKeyGenerated(generatedKey.privateKeyNsec);
    handleClose();
  };

  const handleClose = () => {
    setStep('confirm');
    setGeneratedKey(null);
    setShowPrivateKey(false);
    setConfirmationChecks({
      understand: false,
      written: false,
      secure: false,
    });
    onOpenChange(false);
  };

  const canProceed =
    confirmationChecks.understand &&
    confirmationChecks.written &&
    confirmationChecks.secure;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <Shield className='h-5 w-5 text-blue-500' />
                Generate New Nostr Key
              </DialogTitle>
              <DialogDescription>
                This will create a new Nostr identity for you. You&apos;ll be
                responsible for keeping your private key safe.
              </DialogDescription>
            </DialogHeader>

            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <strong>Important:</strong> Your private key will only be shown
                once. If you lose it, you&apos;ll lose access to your account
                forever.
              </AlertDescription>
            </Alert>

            <div className='space-y-3'>
              <div className='text-muted-foreground text-sm'>
                Before generating your key, please confirm:
              </div>

              <div className='space-y-2'>
                <label className='flex items-center space-x-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={confirmationChecks.understand}
                    onChange={(e) =>
                      setConfirmationChecks((prev) => ({
                        ...prev,
                        understand: e.target.checked,
                      }))
                    }
                  />
                  <span>I understand this key controls my Nostr identity</span>
                </label>

                <label className='flex items-center space-x-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={confirmationChecks.written}
                    onChange={(e) =>
                      setConfirmationChecks((prev) => ({
                        ...prev,
                        written: e.target.checked,
                      }))
                    }
                  />
                  <span>I will write down my private key in a safe place</span>
                </label>

                <label className='flex items-center space-x-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={confirmationChecks.secure}
                    onChange={(e) =>
                      setConfirmationChecks((prev) => ({
                        ...prev,
                        secure: e.target.checked,
                      }))
                    }
                  />
                  <span>I will never share my private key with anyone</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerateKey} disabled={!canProceed}>
                Generate My Key
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'display' && generatedKey && (
          <>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-red-600'>
                <AlertTriangle className='h-5 w-5' />
                Your Private Key - Save This Now!
              </DialogTitle>
              <DialogDescription>
                This is your private key. Save it somewhere safe - it will not
                be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4'>
              <Alert className='border-red-200 bg-red-50'>
                <AlertTriangle className='h-4 w-4 text-red-600' />
                <AlertDescription className='text-red-800'>
                  <strong>WARNING:</strong> Write this down now! If you lose
                  this key, you&apos;ll lose access to your account forever.
                </AlertDescription>
              </Alert>

              <div className='space-y-2'>
                <Label>Your Public Key (Safe to Share)</Label>
                <div className='flex gap-2'>
                  <Input
                    value={generatedKey.publicKeyNpub}
                    readOnly
                    className='font-mono text-xs'
                  />
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        generatedKey.publicKeyNpub
                      );
                      toast.success('Public key copied');
                    }}
                  >
                    <Copy className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-red-600'>
                  Your Private Key (Keep Secret!)
                </Label>
                <div className='flex gap-2'>
                  <Input
                    type={showPrivateKey ? 'text' : 'password'}
                    value={generatedKey.privateKeyNsec}
                    readOnly
                    className='border-red-200 font-mono text-xs focus:border-red-400'
                  />
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </Button>
                  <Button size='sm' variant='outline' onClick={handleCopyKey}>
                    <Copy className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              <div className='text-muted-foreground rounded bg-gray-50 p-3 text-xs'>
                <strong>Tips:</strong>
                <ul className='mt-1 list-inside list-disc space-y-1'>
                  <li>Write this key down on paper</li>
                  <li>Store it in a password manager</li>
                  <li>Never share it with anyone</li>
                  <li>This key starts with &quot;nsec1&quot;</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' onClick={handleClose}>
                I&apos;ll Set This Up Later
              </Button>
              <Button
                onClick={handleProceed}
                className='bg-green-600 hover:bg-green-700'
              >
                I&apos;ve Saved My Key - Continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
