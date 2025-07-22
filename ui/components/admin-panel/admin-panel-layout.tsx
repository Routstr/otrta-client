interface AdminPanelLayoutProps {
  children: React.ReactNode;
  params: {
    lng: string;
    path: string;
  };
}

export default function AdminPanelLayout({ children }: AdminPanelLayoutProps) {
  return <div className='bg-background min-h-screen'>{children}</div>;
}
