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
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <SiteNav locale={locale} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
