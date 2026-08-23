import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'WhatsApp CRM con Agente IA (Berta)',
  description: 'Sistema CRM de WhatsApp con Agente de Inteligencia Artificial DeepSeek integrado, calificación automática de leads y follow-up.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-dark-bg text-slate-100 flex min-h-screen antialiased">
        <Sidebar />
        <main className="flex-1 overflow-y-auto max-h-screen p-6 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
