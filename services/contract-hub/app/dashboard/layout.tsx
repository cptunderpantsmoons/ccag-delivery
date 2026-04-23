import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect('/sign-in');
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-[100dvh] flex bg-[var(--background)]">
      {/* Sidebar - Client Component with active route highlighting and mobile support */}
      <Sidebar 
        userName={userName} 
        userEmail={userEmail} 
        userInitials={userInitials} 
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:ml-0 bg-[var(--background)]">
        <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
