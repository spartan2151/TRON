import './styles.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Send USDT',
  description: 'TRON USDT allowance spending',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
