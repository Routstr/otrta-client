'use client';

import dynamic from 'next/dynamic';

const LoginPageComponent = dynamic(() => import('./LoginPageComponent'), {
  ssr: false,
  loading: () => (
    <div className='flex min-h-screen items-center justify-center'>
      <div>Loading...</div>
    </div>
  ),
});

export default function LoginPage() {
  return <LoginPageComponent />;
}
