import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, SaveIcon } from 'lucide-react';

import { useState } from 'react';
interface Props {
  addUrl: (url: string) => boolean;
}

export default function URLInput(props: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<boolean | null>(false);

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmission = () => {
    if (validateUrl(url)) {
      const success = props.addUrl(url);
      if (success) {
        setUrl('');
        setError(false);
        return;
      }
      setError(null);
    } else {
      setError(true);
    }
  };

  return (
    <div className='mx-auto mt-10 max-w-md rounded-lg p-6'>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <div className='flex space-x-2'>
            <Input
              id='pk'
              placeholder='https://www.example.com'
              type='text'
              autoCapitalize='none'
              autoCorrect='off'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              type='button'
              size='icon'
              className='rounded-full bg-[#ececec21] p-3 text-black/50 text-white transition duration-100 hover:bg-[#24a0ed] disabled:bg-[#e0e0dc79] dark:text-white/50 dark:hover:bg-[#24a0ed] dark:disabled:bg-[#ececec21] dark:disabled:text-white/50'
              onClick={handleSubmission}
              onKeyDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmission();
              }}
            >
              <SaveIcon className='text-black/50 hover:bg-[#24a0ed] dark:bg-[#ececec21] dark:text-white/50' />
            </Button>
          </div>
        </div>
      </div>
      {error === null && (
        <Alert className='mt-4 bg-green-50'>
          <AlertDescription className='flex items-center'>
            <CheckCircle2 className='mr-2 h-4 w-4 text-green-500' />
            <span>URL exists already</span>
          </AlertDescription>
        </Alert>
      )}
      {error === true && (
        <Alert className={'mt-4 bg-red-50'}>
          <AlertDescription className='flex items-center'>
            <XCircle className='mr-2 h-4 w-4 text-red-500' />
            <span>Failed to validate URL</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
