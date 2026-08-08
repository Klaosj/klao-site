import '../globals.css';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import type { Locale } from '@/lib/models';

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'th' }];
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l: Locale = locale === 'th' ? 'th' : 'en';
  return (
    <html lang={l}>
      <body className="flex min-h-screen flex-col">
        <SiteNav locale={l} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>
        <SiteFooter locale={l} />
      </body>
    </html>
  );
}
