import { Globe } from 'lucide-react';
import { LOCALE_REGION_OPTIONS, UiDictionary } from '../i18n/translations';
import { LocaleRegionOption } from '../types/orbit';

interface FooterBarProps {
  visible: boolean;
  localeOption: LocaleRegionOption;
  dict: UiDictionary;
  onOpenLegal: () => void;
  onSelectLocaleRegion: (optionId: string) => void;
}

export function FooterBar({
  visible,
  localeOption,
  dict,
  onOpenLegal,
  onSelectLocaleRegion,
}: FooterBarProps) {
  return (
    <footer
      data-testid="minimal-footer"
      className="fixed left-0 right-0 bottom-0 z-20 px-4 pb-[max(12px,var(--sb))] pt-2 flex justify-center transition-opacity duration-300"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-xs sm:text-[13px]">
        <p className="m-0 leading-relaxed" style={{ color: 'var(--mut)' }}>
          {dict.footerPrefix}{' '}
          <button
            type="button"
            data-testid="footer-legal-link"
            onClick={onOpenLegal}
            className="underline underline-offset-4 font-semibold cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
            style={{ color: 'var(--acc-text)' }}
          >
            {dict.footerLegalLink}
          </button>
        </p>

        <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--glass)' }}>
          <Globe className="w-3.5 h-3.5 opacity-60 shrink-0" aria-hidden="true" />
          <select
            data-testid="locale-region-select"
            aria-label={dict.regionSelectorAria}
            value={localeOption.id}
            onChange={(e) => onSelectLocaleRegion(e.target.value)}
            className="bg-transparent border-0 outline-none text-xs sm:text-[13px] font-medium cursor-pointer pr-1"
            style={{ color: 'var(--fg)' }}
          >
            {LOCALE_REGION_OPTIONS.map((opt) => (
              <option
                key={opt.id}
                value={opt.id}
                style={{ backgroundColor: 'var(--surface-solid)', color: 'var(--fg)' }}
              >
                {opt.shortLabel}
              </option>
            ))}
          </select>
        </label>
      </div>
    </footer>
  );
}
