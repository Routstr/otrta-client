import { SchemaResponseSourceProps } from '@/src/api/web-search';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { File } from 'lucide-react';
import { Fragment, useState } from 'react';
import Image from 'next/image';

const MessageSources = ({
  sources,
}: {
  sources: SchemaResponseSourceProps[];
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const closeModal = () => {
    setIsDialogOpen(false);
    document.body.classList.remove('overflow-hidden-scrollable');
  };

  const openModal = () => {
    setIsDialogOpen(true);
    document.body.classList.add('overflow-hidden-scrollable');
  };

  return (
    <div className='flex justify-between'>
      <div className='grid w-full grid-cols-2 gap-2 lg:grid-cols-4'>
        {sources.slice(0, 3).map((source, i) => (
          <a
            className='flex flex-col space-y-2 rounded-lg bg-zinc-100 p-3 font-medium transition duration-200 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800'
            key={i}
            href={source.metadata.url}
            target='_blank'
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
        ))}
        {sources.length > 3 && (
          <div className='flex'>
            <button
              onClick={openModal}
              className='flex-1 flex-col space-y-2 rounded-lg bg-zinc-100 p-3 font-medium transition duration-200 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800'
            >
              <div className='flex flex-row items-center space-x-1'>
                {sources.slice(3, 6).map((source, i) => {
                  return source.metadata.url === 'File' ? (
                    <div
                      key={i}
                      className='flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 transition duration-200 hover:bg-zinc-200'
                    >
                      <File size={12} className='text-white/70' />
                    </div>
                  ) : (
                    <Image
                      src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                      width={16}
                      height={16}
                      alt='favicon'
                      className='h-4 w-4 rounded-lg'
                      key={i}
                      unoptimized
                    />
                  );
                })}
              </div>
              <p className='text-left text-xs text-black/50 dark:text-white/50'>
                View {sources.length - 3} more
              </p>
            </button>
          </div>
        )}
        <Transition appear show={isDialogOpen} as={Fragment}>
          <Dialog as='div' className='relative z-50' onClose={closeModal}>
            <div className='fixed inset-0 overflow-y-auto'>
              <div className='flex min-h-full items-center justify-center p-4 text-center'>
                <TransitionChild
                  as={Fragment}
                  enter='ease-out duration-200'
                  enterFrom='opacity-0 scale-95'
                  enterTo='opacity-100 scale-100'
                  leave='ease-in duration-100'
                  leaveFrom='opacity-100 scale-200'
                  leaveTo='opacity-0 scale-95'
                >
                  <DialogPanel className='border-light-200 dark:border-dark-200 w-full max-w-md transform rounded-2xl border bg-zinc-50 p-6 text-left align-middle shadow-xl transition-all dark:bg-zinc-900'>
                    <DialogTitle className='text-lg leading-6 font-medium dark:text-white'>
                      Sources
                    </DialogTitle>
                    <div className='mt-2 grid max-h-[300px] grid-cols-2 gap-2 overflow-auto pr-2'>
                      {sources.map((source, i) => (
                        <a
                          className='border-light-200 dark:border-dark-200 flex flex-col space-y-2 rounded-lg border bg-zinc-100 p-3 font-medium transition duration-200 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                          key={i}
                          href={source.metadata.url}
                          target='_blank'
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
                                {source.metadata.url.replace(
                                  /.+\/\/|www.|\..+/g,
                                  ''
                                )}
                              </p>
                            </div>
                            <div className='flex flex-row items-center space-x-1 text-xs text-black/50 dark:text-white/50'>
                              <div className='h-[4px] w-[4px] rounded-full bg-black/50 dark:bg-white/50' />
                              <span>{i + 1}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
};

export default MessageSources;
