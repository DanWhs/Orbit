import { memo } from 'react';
import { Coffee } from 'lucide-react';
import { BubbleAnchor } from './LiquidBubble';

interface BuyMeCoffeeButtonProps {
  compact?: boolean;
  variant?: 'accent' | 'glass';
  className?: string;
  onClick?: () => void;
  testId?: string;
}

export const BuyMeCoffeeButton = memo(function BuyMeCoffeeButton({
  compact = false,
  variant = 'accent',
  className = '',
  onClick,
  testId = 'buy-me-coffee-btn',
}: BuyMeCoffeeButtonProps) {
  const isAccent = variant === 'accent';

  return (
    <BubbleAnchor
      href="https://www.buymeacoffee.com/OrbitHome"
      target="_blank"
      rel="noopener noreferrer"
      variant={isAccent ? 'solid' : 'glass'}
      tabIndex={0}
      data-testid={testId}
      data-name="bmc-button"
      data-slug="OrbitHome"
      data-emoji="☕"
      data-text="Buy me a coffee"
      onClick={onClick}
      contentClassName="flex items-center justify-center gap-2 w-full h-full leading-none"
      className={`rounded-full backdrop-blur-lg transition-transform duration-200 hover:bg-[var(--glass2)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)] ${
        compact
          ? 'h-8 px-3 text-[12px] font-medium'
          : 'h-11 px-5 text-[13.5px] font-medium'
      } ${className}`}
      style={{
        backgroundColor: isAccent ? 'var(--acc)' : 'var(--glass)',
        color: isAccent ? 'var(--acc-fg)' : 'var(--fg)',
        boxShadow: isAccent ? 'none' : 'inset 0 0 0 1px var(--border-subtle)',
        textDecoration: 'none',
      }}
    >
      <Coffee
        className={compact ? 'w-3.5 h-3.5 shrink-0 opacity-85' : 'w-4 h-4 shrink-0 opacity-90'}
        aria-hidden="true"
      />
      <span className="whitespace-nowrap leading-none">Buy me a coffee</span>
    </BubbleAnchor>
  );
});
