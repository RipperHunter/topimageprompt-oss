"use client";
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import PageTransition from './motion/PageTransition';

// Routes where the public Navbar & Footer should be hidden
const NO_SHELL_ROUTES = ['/admin', '/login', '/signup'];

export default function ConditionalLayout({ children, navigationData }) {
  const pathname = usePathname();
  
  // Hide shell for admin routes and auth pages
  const hideShell = NO_SHELL_ROUTES.some(route => pathname.startsWith(route));
  const isExplore = pathname.startsWith('/explore');

  if (hideShell) {
    return <>{children}</>;
  }

  if (isExplore) {
    return (
      <>
        <div className="explore-navbar-wrapper">
          <Navbar navigationData={navigationData} />
        </div>
        <PageTransition key={pathname}>{children}</PageTransition>
      </>
    );
  }

  return (
    <>
      <Navbar navigationData={navigationData} />
      <PageTransition key={pathname}>{children}</PageTransition>
      <Footer />
    </>
  );
}
