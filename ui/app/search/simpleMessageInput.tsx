import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

export function SimpleMessageInput({
  sendMessage,
  loading,
}: {
  sendMessage: (message: string) => void;
  loading: boolean;
}) {
  const [message, setMessage] = useState('');
  const [textareaRows, setTextareaRows] = useState(1);
  const [mode, setMode] = useState<'multi' | 'single'>('multi');

  useEffect(() => {
    if (textareaRows >= 2 && message && mode === 'single') {
      setMode('multi');
    } else if (!message && mode === 'multi') {
      setMode('single');
    }
  }, [textareaRows, mode, message]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;

      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <form
      onSubmit={(e) => {
        if (loading) return;
        e.preventDefault();
        sendMessage(message);
        setMessage('');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !loading) {
          e.preventDefault();
          sendMessage(message);
          setMessage('');
        }
      }}
      className={cn(
        'border-light-200 dark:border-dark-200 flex items-center overflow-hidden border bg-zinc-100 p-4 font-medium transition duration-200 dark:bg-zinc-900',
        mode === 'multi' ? 'flex-col rounded-lg' : 'flex-row rounded-full'
      )}
    >
      <TextareaAutosize
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onHeightChange={(height, props) => {
          setTextareaRows(Math.ceil(height / props.rowHeight));
        }}
        className='max-h-24 w-full shrink grow resize-none bg-transparent px-2 text-sm transition placeholder:text-sm focus:outline-hidden lg:max-h-36 xl:max-h-48 dark:text-white dark:placeholder:text-white/50'
        placeholder='Ask a follow-up'
      />
      {mode === 'single' && (
        <div className='flex flex-row items-center space-x-4'>
          <button
            disabled={message.trim().length === 0 || loading}
            className='hover:bg-opacity-85 rounded-full bg-[#24A0ED] p-2 text-white transition duration-100 disabled:bg-[#e0e0dc79] disabled:text-black/50 dark:disabled:bg-[#ececec21] dark:disabled:text-white/50'
          >
            <ArrowUp className='hover:bg-opacity-85' size={17} />
          </button>
        </div>
      )}
      {mode === 'multi' && (
        <div className='flex w-full flex-row items-center justify-between pt-2'>
          <div className='flex flex-row items-center space-x-4'>
            <button
              disabled={message.trim().length === 0 || loading}
              className='hover:bg-opacity-85 rounded-full bg-[#24A0ED] p-2 text-black/50 text-white transition duration-100 disabled:bg-[#e0e0dc79] dark:disabled:bg-[#ececec21] dark:disabled:text-white/50'
            >
              <ArrowUp className='hover:bg-opacity-85' size={17} />
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
