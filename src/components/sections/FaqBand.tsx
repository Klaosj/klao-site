import DeepLink from '@/components/DeepLink';
import { Icon } from '@/components/icons';
import Reveal from '@/components/motion/Reveal';
import PaletteButton from '@/components/PaletteButton';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { faqAnchorId } from '@/lib/link-target';
import type { FaqItem, Locale } from '@/lib/models';
import FaqExpandAll from './FaqExpandAll';
import './faq.css';

// #faq (spec §6, C7): "What people usually ask." Server component; the
// answers are native <details>, so every answer is in the server HTML and
// opens without JavaScript. Client islands only add Expand all, the deep
// links' in-place behaviour and the ⌘K line.
export default function FaqBand({ items, locale }: { items: FaqItem[]; locale: Locale }) {
  const t = dict[locale];
  // ClientsBand's rule: an empty band must not exist (all rows unpublished).
  if (items.length === 0) return null;
  return (
    <section id="faq" className="section" aria-labelledby="faq-h">
      <div className="wrap-wide">
        <Reveal className="faq-head">
          <h2 id="faq-h" className="t-h2" tabIndex={-1}>
            <ThaiText text={t.faqTitle} />
          </h2>
          <FaqExpandAll expandLabel={t.faqExpand} collapseLabel={t.faqCollapse} />
        </Reveal>
        <div className="faq-list">
          {items.map((item) => (
            <details key={item.id} id={faqAnchorId(item.id)} className="faq-item">
              <summary className="t-faq">
                <span>
                  <ThaiText text={item.question[locale]} />
                </span>
                <span className="faq-chv" aria-hidden="true">
                  <Icon name="caret-right" />
                </span>
              </summary>
              <div className="faq-a t-body">
                <p>
                  <ThaiText text={item.answer[locale]} />
                </p>
                {item.links.length > 0 && (
                  <p className="faq-src">
                    {t.faqSource}{' '}
                    {item.links.map((link, i) => (
                      <span key={`${link.target}-${i}`}>
                        {i > 0 && ' · '}
                        <DeepLink target={link.target} locale={locale}>
                          {link.label[locale]}
                        </DeepLink>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
        <p className="faq-more">
          <PaletteButton className="faq-ask">{t.faqMore}</PaletteButton>
        </p>
      </div>
    </section>
  );
}
