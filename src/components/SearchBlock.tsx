import { memo } from 'react';
import { ArrowRight, Clock, Globe, Search, Trash2 } from 'lucide-react';
import { QuickLink, SearchSuggestion } from '../types/orbit';
import { UiDictionary } from '../i18n/translations';
import { playUiSound } from '../utils/orbSounds';
import {
  BubbleAnchor,
  BubbleButton,
  LiquidBubbleLayers,
  useLiquidBubble,
} from './LiquidBubble';

interface SearchBlockProps {
  visible: boolean;
  uiTopY: number;
  animateStageTransition: boolean;
  query: string;
  isFocused: boolean;
  quickLinks: QuickLink[];
  suggestions: SearchSuggestion[];
  visibleSuggestions: number;
  dict: UiDictionary;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQueryChange: (val: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: (val?: string) => void;
  onCaretMove: () => void;
  onClearHistory: () => void;
}

export const SearchBlock = memo(function SearchBlock({
  visible,
  uiTopY,
  animateStageTransition,
  query,
  isFocused,
  quickLinks,
  suggestions,
  visibleSuggestions,
  dict,
  inputRef,
  onQueryChange,
  onFocus,
  onBlur,
  onSubmit,
  onCaretMove,
  onClearHistory,
}: SearchBlockProps) {
  const activeSuggestions = isFocused ? suggestions.slice(0, visibleSuggestions) : [];
  const showSuggestions = activeSuggestions.length > 0;
  const hasHistorySuggestions = activeSuggestions.some((item) => item.kind === 'history');
  const hasQuery = query.trim().length > 0;

  const searchBarBubble = useLiquidBubble({
    variant: 'glass',
    scope: 'self',
  });

  return (
    <div
      id="search-ui"
      data-testid="search-ui-block"
      className="absolute left-1/2 top-0 z-20"
      style={{
        width: 'min(560px, calc(100% - 32px))',
        transform: `translate3d(-50%, ${uiTopY.toFixed(2)}px, 0)`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: animateStageTransition
          ? 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 360ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Search Bar (preserves exact frosted glass design, adds perimeter glow + click pulse) */}
      <form
        data-testid="search-bar"
        {...searchBarBubble.dataProps}
        onPointerEnter={searchBarBubble.onPointerEnter}
        onPointerLeave={searchBarBubble.onPointerLeave}
        onBlur={searchBarBubble.onBlur}
        onClick={(e) => searchBarBubble.handleClick(e)}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={`${searchBarBubble.stateClass} h-[58px] pl-5 pr-2 rounded-full backdrop-blur-lg`}
        style={{
          backgroundColor: isFocused ? 'var(--glass2)' : 'var(--glass)',
          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
        }}
      >
        <LiquidBubbleLayers />
        <div className="bubble-content flex items-center gap-2.5 w-full h-full">
          <Search className="w-5 h-5 shrink-0 opacity-55" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              onCaretMove();
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyUp={onCaretMove}
            onClick={onCaretMove}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                inputRef.current?.blur();
              }
            }}
            placeholder={dict.searchPlaceholder}
            aria-label={dict.searchAriaLabel}
            className="flex-1 min-w-0 h-full bg-transparent border-0 outline-none text-[17px] font-medium placeholder:text-[var(--mut)]"
            style={{
              color: 'var(--fg)',
              caretColor: 'var(--acc)',
            }}
          />
          <BubbleButton
            type="submit"
            variant="solid"
            aria-label={dict.searchSubmitAria}
            onPointerDown={(e) => e.preventDefault()}
            contentClassName="grid place-items-center w-full h-full"
            className="w-[42px] h-[42px] rounded-full shrink-0 cursor-pointer transition-all duration-300 active:scale-90"
            style={{
              backgroundColor: 'var(--acc)',
              color: 'var(--acc-fg)',
              opacity: hasQuery ? 1 : 0,
              transform: hasQuery ? 'scale(1)' : 'scale(0.6)',
              pointerEvents: hasQuery ? 'auto' : 'none',
            }}
          >
            <ArrowRight className="w-5 h-5" />
          </BubbleButton>
        </div>
      </form>

      {/* Quick Links Row — exact same total width & pill design as before, with liquid perimeter glow */}
      {quickLinks.length > 0 && (
        <nav
          data-testid="quick-links-bar"
          aria-label={dict.quickLinksLabel}
          className="grid gap-2 w-full mt-2.5 transition-all duration-300"
          style={{
            gridTemplateColumns: `repeat(${quickLinks.length}, minmax(0, 1fr))`,
            opacity: showSuggestions ? 0 : 1,
            transform: showSuggestions ? 'translateY(-6px)' : 'translateY(0)',
            pointerEvents: showSuggestions ? 'none' : 'auto',
          }}
        >
          {quickLinks.map((link) => (
            <BubbleAnchor
              key={link.id}
              variant="solid"
              href={link.url}
              onClick={() => playUiSound('quicklink-tap')}
              contentClassName="flex items-center justify-center w-full h-full min-w-0"
              className="h-[42px] px-1.5 sm:px-3 rounded-full text-[13.5px] sm:text-[14.5px] font-semibold backdrop-blur-lg hover:bg-[var(--glass2)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
              style={{
                backgroundColor: 'var(--glass)',
                color: 'var(--fg)',
                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              }}
              title={link.title}
            >
              <span className="truncate">{link.title}</span>
            </BubbleAnchor>
          ))}
        </nav>
      )}

      {/* Search Suggestions & History Overlay */}
      {showSuggestions && (
        <div
          data-testid="suggestions-list"
          className="flex flex-col gap-2 mt-2.5 w-full"
          style={{
            marginTop: quickLinks.length > 0 ? '-42px' : '10px',
          }}
        >
          {activeSuggestions.map((item) => (
            <BubbleButton
              key={`${item.kind}-${item.text}`}
              variant="glass"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onSubmit(item.text)}
              contentClassName="flex items-center gap-3 w-full h-full min-w-0"
              className="w-full h-[46px] px-4 rounded-full text-left text-[16px] font-medium backdrop-blur-lg cursor-pointer hover:bg-[var(--glass2)] active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--glass)',
                color: 'var(--fg)',
                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              }}
            >
              {item.kind === 'history' ? (
                <Clock className="w-4 h-4 shrink-0 opacity-55" aria-hidden="true" />
              ) : item.kind === 'url' ? (
                <Globe className="w-4 h-4 shrink-0 opacity-55" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4 shrink-0 opacity-55" aria-hidden="true" />
              )}
              <span className="truncate">{item.text}</span>
            </BubbleButton>
          ))}

          {hasHistorySuggestions && (
            <div className="flex justify-end pt-0.5">
              <BubbleButton
                variant="glass"
                data-testid="clear-history-btn"
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClearHistory();
                }}
                contentClassName="inline-flex items-center justify-center gap-1.5"
                className="h-[34px] px-3.5 rounded-full text-[13px] font-medium backdrop-blur-lg cursor-pointer hover:bg-[var(--glass2)] active:scale-[0.97]"
                style={{
                  backgroundColor: 'var(--glass)',
                  color: 'var(--mut)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0 opacity-75" aria-hidden="true" />
                <span>{dict.clearHistoryLabel}</span>
              </BubbleButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
