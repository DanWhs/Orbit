export interface StageLayoutInput {
  viewportWidth: number;
  viewportHeight: number;
  fullHeight: number;
  safeTop: number;
  safeBottom: number;
  isMobile: boolean;
  isFocused: boolean;
  hasQuickLinks: boolean;
  suggestionCount: number;
}

export interface StageLayoutResult {
  botSize: number;
  botCenterY: number;
  uiTopY: number;
  scale: number;
  baseBotSize: number;
  visibleSuggestions: number;
  keyboardActive: boolean;
}

export interface DamperState {
  p: number;
  v: number;
}

const BAR_HEIGHT = 58;
const QUICK_LINKS_HEIGHT = 52; // 10px top gap + 42px row height
const SUGGESTION_ROW_HEIGHT = 46;
const SUGGESTION_GAP = 8;
const SUGGESTION_TOP_GAP = 10;

export function computeBaseBotSize(viewportWidth: number, viewportHeight: number): number {
  return Math.round(Math.max(88, Math.min(230, viewportWidth * 0.5, viewportHeight * 0.27)));
}

/**
 * Computes exact vertical centering for the entire central group (bot + search bar + quick links)
 * at rest on both desktop and mobile, and smoothly shifts the group upward without clipping
 * when the mobile virtual keyboard shrinks visualViewport.height.
 */
export function computeStageLayout(input: StageLayoutInput): StageLayoutResult {
  const {
    viewportWidth,
    viewportHeight,
    fullHeight,
    safeTop,
    safeBottom,
    isMobile,
    isFocused,
    hasQuickLinks,
    suggestionCount,
  } = input;

  const baseH = Math.max(viewportHeight, fullHeight || viewportHeight);
  const baseBotSize = computeBaseBotSize(viewportWidth, baseH);

  // Detect active virtual keyboard via visualViewport shrink or mobile input focus
  const viewportShrunk = baseH > 0 && viewportHeight < baseH * 0.84;
  const keyboardActive = isMobile && (isFocused || viewportShrunk);

  const topReserve = safeTop + (isMobile ? 54 : 62);
  const bottomReserve = keyboardActive ? 10 : safeBottom + (isMobile ? 54 : 58);
  const usableHeight = Math.max(180, viewportHeight - topReserve - bottomReserve);

  // Bot orbital ring extends 13% outside botSize (~24px-30px), so keep gap generous
  const botBarGap = isMobile ? 34 : 42;
  const quickH = hasQuickLinks ? QUICK_LINKS_HEIGHT : 0;

  if (!keyboardActive) {
    // IDLE / CENTERED STATE (Desktop & Mobile):
    // Center the entire group [bot + gap + searchBar + quickLinks] vertically within the viewport.
    // On desktop, reserve space consistently for available suggestions so focusing/blurring never jumps the stage.
    const reservedSugCount = !isMobile ? Math.min(2, suggestionCount) : 0;
    const activeSugCount = !isMobile && isFocused ? reservedSugCount : 0;
    const sugH =
      reservedSugCount > 0
        ? SUGGESTION_TOP_GAP + reservedSugCount * SUGGESTION_ROW_HEIGHT + (reservedSugCount - 1) * SUGGESTION_GAP
        : 0;
    const underBarH = Math.max(quickH, sugH);

    // Ensure the bot fits comfortably within usableHeight while keeping proportions balanced
    const maxBotRoom = Math.max(64, usableHeight - botBarGap - BAR_HEIGHT - underBarH);
    const botSize = Math.min(baseBotSize, maxBotRoom);
    const groupTotalHeight = botSize + botBarGap + BAR_HEIGHT + quickH;

    // Exact vertical center in the full viewport, clamped safely against top/bottom bars
    const idealTop = (viewportHeight - groupTotalHeight) / 2;
    const minTop = topReserve;
    const maxTop = Math.max(minTop, viewportHeight - bottomReserve - groupTotalHeight);
    const groupTop = Math.max(minTop, Math.min(maxTop, idealTop));

    return {
      botSize,
      botCenterY: groupTop + botSize / 2,
      uiTopY: groupTop + botSize + botBarGap,
      scale: botSize / baseBotSize,
      baseBotSize,
      visibleSuggestions: !isMobile && isFocused ? activeSugCount : 0,
      keyboardActive: false,
    };
  }

  // MOBILE KEYBOARD OPEN STATE:
  // Translate the group smoothly upward inside the remaining visualViewport height
  // keeping bot + search bar + (suggestions or quick links) 100% visible and unclipped.
  const compactGap = 24;
  const minBot = 60;
  const availableTop = safeTop + 12;
  const availableBottom = viewportHeight - 10;
  const roomTotal = Math.max(150, availableBottom - availableTop);

  // Try fitting up to 2 suggestions (if typing/focused), otherwise drop to 1 or 0
  const maxSugWanted = Math.min(2, suggestionCount);
  for (let n = maxSugWanted; n >= 0; n--) {
    const sugH =
      n > 0 ? SUGGESTION_TOP_GAP + n * SUGGESTION_ROW_HEIGHT + (n - 1) * SUGGESTION_GAP : quickH;
    const roomForBot = roomTotal - compactGap - BAR_HEIGHT - sugH;
    if (roomForBot >= minBot || n === 0) {
      const botSize = Math.max(48, Math.min(baseBotSize * 0.72, roomForBot));
      const totalBlock = botSize + compactGap + BAR_HEIGHT + sugH;
      const top = Math.max(availableTop, availableTop + (roomTotal - totalBlock) * 0.35);

      return {
        botSize,
        botCenterY: top + botSize / 2,
        uiTopY: top + botSize + compactGap,
        scale: botSize / baseBotSize,
        baseBotSize,
        visibleSuggestions: isFocused ? n : 0,
        keyboardActive: true,
      };
    }
  }

  return {
    botSize: minBot,
    botCenterY: availableTop + minBot / 2,
    uiTopY: availableTop + minBot + compactGap,
    scale: minBot / baseBotSize,
    baseBotSize,
    visibleSuggestions: 0,
    keyboardActive: true,
  };
}

export function damp(state: DamperState, target: number, smoothTime: number, dt: number): number {
  const omega = 2 / Math.max(0.01, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.p - target;
  const temp = (state.v + omega * change) * dt;
  state.v = (state.v - omega * temp) * exp;
  state.p = target + (change + temp) * exp;
  return state.p;
}
