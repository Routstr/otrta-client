import { SchemaResponseSourceProps } from '@/src/api/web-search';
import { File, XIcon } from 'lucide-react';

import { DialogContent } from '@/components/ui/dialog';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import URLInput from './urlInput';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SimpleMessageInput } from './simpleMessageInput';

interface Props {
  sources: SchemaResponseSourceProps[];
  sendMessage: (message: string) => void;
  loading: boolean;
  currentGroup: string;
}

export function SourceSelection(props: Props) {
  const [selected, setSelected] = useState<SchemaResponseSourceProps[]>([]);
  const [added, setAdded] = useState<string[]>([]);

  const addSource = (e: string): boolean => {
    const exist = added.some((item) => item === e);

    if (!exist) {
      setAdded([...added, e]);
      return true;
    }

    return false;
  };
  const deleteSource = (source: string) => {
    setAdded(added.filter((item) => item !== source));
  };

  const onSelect = (source: SchemaResponseSourceProps) => {
    const isSelected = selected.some((item) => item === source);

    if (isSelected) {
      setSelected(selected.filter((item) => item !== source));
    } else {
      setSelected([...selected, source]);
    }
  };

  return (
    <DialogContent>
      <div className='grid grid-cols-2 gap-2 lg:grid-cols-3'>
        {props.sources.map((source, i) => (
          <div key={i} className='flex'>
            <Checkbox onClick={() => onSelect(source)} />
            <a
              className={cn(
                'flex-1 flex-col space-y-2 overflow-hidden rounded-lg bg-zinc-100 p-3 font-medium transition duration-200 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800',
                selected.find((f) => f === source) ? 'bg-green-100' : ''
              )}
              key={i}
              href={source.metadata.url}
              target='_blank'
              rel='noopener'
            >
              <p className='overflow-hidden text-xs text-ellipsis whitespace-nowrap dark:text-white'>
                {source.metadata.title}
              </p>
              <div className='flex flex-row items-center justify-between'>
                <div className='flex flex-row items-center space-x-1'>
                  {source.metadata.url === 'File' ? (
                    <div className='bg-dark-200 hover:bg-dark-100 flex h-6 w-6 items-center justify-center rounded-full transition duration-200'>
                      <File size={12} className='text-white/70' />
                    </div>
                  ) : (
                    <Image
                      src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                      width={16}
                      height={16}
                      alt='favicon'
                      className='h-4 w-4 rounded-lg'
                      unoptimized
                    />
                  )}
                  <p className='overflow-hidden text-xs text-ellipsis whitespace-nowrap text-black/50 dark:text-white/50'>
                    {source.metadata.url.replace(/.+\/\/|www.|\..+/g, '')}
                  </p>
                </div>
                <div className='flex flex-row items-center space-x-1 text-xs text-black/50 dark:text-white/50'>
                  <div className='h-[4px] w-[4px] rounded-full bg-black/50 dark:bg-white/50' />
                  <span>{i + 1}</span>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
      <div className='grid grid-cols-2 gap-2 lg:grid-cols-2'>
        {added.map((v, i) => (
          <div
            key={i}
            className='flex justify-between rounded-lg bg-zinc-100 transition duration-200 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800'
          >
            <HoverCard key={i}>
              <HoverCardTrigger
                href={v}
                target='_blank'
                rel='noopener'
                className='flex-1 overflow-hidden p-3'
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
      <SimpleMessageInput {...props} />
    </DialogContent>
  );
}
