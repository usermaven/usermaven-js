import type { Metadata } from 'next';
import './globals.css';
import LayoutWrapper from '@/component/client/LayoutWrapper';

export const metadata: Metadata = {
  title: 'Next.js 14 with Usermaven',
  description: 'Testing Usermaven with Next.js 14 and React 18',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
