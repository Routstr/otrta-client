import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { XIcon, File, LinkIcon } from 'lucide-react';
import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import URLInput from './urlInput';

export function AddUrlDialog({
  urls,
  setUrls,
  isLoading,
}: {
  urls: string[];
  setUrls: Dispatch<SetStateAction<string[]>>;
  isLoading: boolean;
}) {
  const addSource = (url: string): boolean => {
    const exist = urls.some((item) => item === url);

    if (!exist) {
      setUrls([...urls, url]);
      return true;
    }

    return false;
  };

  const deleteSource = (source: string) => {
    setUrls(urls.filter((item) => item !== source));
  };
  const [open, setOpen] = useState(false);
  const onClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          disabled={isLoading}
          className='relative rounded-full bg-[#ececec21] p-3 text-black/50 text-white transition duration-100 hover:bg-[#24a0ed] disabled:bg-[#e0e0dc79] disabled:text-black/50 dark:text-white/50 dark:hover:bg-[#24a0ed] dark:disabled:bg-[#ececec21] dark:disabled:text-white/50'
          onClick={onClick}
          type='button'
        >
          <LinkIcon
            className='dar:text-white/50 text-black/50 hover:bg-[#24a0ed] dark:bg-[#ececec21] dark:text-white/50'
            size={17}
          />
          <div className='absolute -end-1 -top-2 m-1 min-w-5 translate-x-1/4 rounded-full bg-teal-500 px-1 py-0.5 text-center text-xs text-nowrap text-white'>
            <div className='absolute start-0 top-0 -z-10 h-full w-full animate-ping rounded-full bg-teal-200'></div>
            {urls.length}
          </div>
        </button>
      </DialogTrigger>
      <DialogTitle></DialogTitle>
      <DialogContent>
        <div className='grid grid-cols-2 gap-2 lg:grid-cols-2'>
          {urls.map((v, i) => (
            <div
              key={i}
              className='flex justify-between rounded-lg bg-zinc-100 transition duration-200 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800'
            >
              <HoverCard key={i}>
                <HoverCardTrigger className='flex-1 overflow-hidden p-3'>
                  <a
                    className='space-y-2 font-medium'
                    key={i}
                    href={v}
                    target='_blank'
                    rel='noopener'
                  >
                    <p className='overflow-hidden text-xs text-ellipsis whitespace-nowrap dark:text-white'>
                      {v}
                    </p>
                    <div className='flex flex-row items-center justify-between'>
                      <div className='flex flex-row items-center space-x-1'>
                        {v === 'File' ? (
                          <div className='bg-dark-200 hover:bg-dark-100 flex h-6 w-6 items-center justify-center rounded-full transition duration-200'>
                            <File size={12} className='text-white/70' />
                          </div>
                        ) : (
                          <Image
                            src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${v}`}
                            width={16}
                            height={16}
                            alt='favicon'
                            className='h-4 w-4 rounded-lg'
                            unoptimized
                          />
                        )}
                        <p className='overflow-hidden text-xs text-ellipsis whitespace-nowrap text-black/50 dark:text-white/50'>
                          {v.replace(/.+\/\/|www.|\..+/g, '')}
                        </p>
                      </div>
                      <div className='flex flex-row items-center space-x-1 text-xs text-black/50 dark:text-white/50'>
                        <div className='h-[4px] w-[4px] rounded-full bg-black/50 dark:bg-white/50' />
                        <span>{i + 1}</span>
                      </div>
                    </div>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className='flex justify-between space-x-4'>
                    <Avatar>
                      <AvatarImage
                        src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${v}`}
                        width={10}
                        height={10}
                      />
                      <AvatarFallback>VC</AvatarFallback>
                    </Avatar>
                    <div className='space-y-1'>
                      <h4 className='text-sm font-semibold'>
                        {v.replace(/.+\/\/|www.|\..+/g, '')}
                      </h4>
                      <p className='overflow-hidden text-sm text-wrap'> {v} </p>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <XIcon onClick={() => deleteSource(v)} className='m-2 h-5 w-5' />
            </div>
          ))}
        </div>
        <URLInput addUrl={addSource} />
      </DialogContent>
    </Dialog>
  );
}
