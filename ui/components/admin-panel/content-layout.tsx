interface ContentLayoutProps {
  title: string;
  lng: string;
  path: string;
  children: React.ReactNode;
}

export function ContentLayout({ title, children }: ContentLayoutProps) {
  return (
    <div className='flex min-h-screen flex-col'>
      {title && (
        <header className='border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur'>
          <div className='container flex h-14 items-center'>
            <h1 className='text-lg font-semibold'>{title}</h1>
          </div>
        </header>
      )}
      <main className='flex-1'>{children}</main>
    </div>
  );
}
