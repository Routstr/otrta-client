'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollNavigatorProps {
  alwaysShow?: boolean;
  upTriggerOffset?: number;
  downTriggerOffset?: number;
  rightOffset?: number;
}

export function ScrollNavigator({
  alwaysShow = false,
  upTriggerOffset = 200,
  downTriggerOffset = 200,
  rightOffset = 8,
}: ScrollNavigatorProps) {
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);

  useEffect(() => {
    const checkScrollPosition = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      setShowUp(alwaysShow || scrollY > upTriggerOffset);
      setShowDown(
        alwaysShow ||
          scrollY < documentHeight - windowHeight - downTriggerOffset
      );
    };

    checkScrollPosition();
    window.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [alwaysShow, upTriggerOffset, downTriggerOffset]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div
      className='fixed z-50 flex flex-col gap-2'
      style={{
        right: rightOffset,
        bottom: '50%',
        transform: 'translateY(50%)',
      }}
    >
      {showUp && (
        <Button
          variant='outline'
          size='sm'
          onClick={scrollToTop}
          className='h-10 w-10 rounded-full p-0 shadow-lg transition-shadow hover:shadow-xl'
        >
          <ArrowUpCircle className='h-4 w-4' />
          <span className='sr-only'>Scroll to top</span>
        </Button>
      )}
      {showDown && (
        <Button
          variant='outline'
          size='sm'
          onClick={scrollToBottom}
          className='h-10 w-10 rounded-full p-0 shadow-lg transition-shadow hover:shadow-xl'
        >
          <ArrowDownCircle className='h-4 w-4' />
          <span className='sr-only'>Scroll to bottom</span>
        </Button>
      )}
    </div>
  );
}
