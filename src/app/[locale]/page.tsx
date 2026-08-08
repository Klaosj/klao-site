import type { Locale } from '@/lib/models';

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  await params;
  return <h1 className="font-display text-3xl">KLAO</h1>;
}
