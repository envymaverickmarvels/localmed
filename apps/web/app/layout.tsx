import { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components';

export const metadata = {
  title: 'LocalMed - Find Medicines Near You',
  description: 'Hyperlocal medicine availability platform. Search for medicines and find nearby pharmacies with stock.',
  keywords: ['medicine', 'pharmacy', 'healthcare', 'medicine availability', 'local pharmacy'],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}