import { type ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  onNavigate?: (page: string) => void;
}

export default function Layout({ children, onNavigate }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onNavigate={onNavigate} />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
