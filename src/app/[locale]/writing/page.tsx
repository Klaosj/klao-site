import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';

export default async function WritingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <h1 className="font-display text-3xl">{dict[locale].writing}</h1>;
}
