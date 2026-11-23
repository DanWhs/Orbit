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

export const ORB_RING_SCALE = 1.26;
export const ORB_RING_RADIUS_VB = 49;
export const ORB_RING_STROKE_VB = 2.25;
// Outer radius of orbital ring relative to sphere diameter: ((49 + 2.25 / 2) / 100) * 1.26 = 0.631575
export const ORB_RING_OUTER_RADIUS_RATIO =
  ((ORB_RING_RADIUS_VB + ORB_RING_STROKE_VB / 2) / 100) * ORB_RING_SCALE;
const ORB_RING_OVERHANG_RATIO = ORB_RING_OUTER_RADIUS_RATIO - 0.5;

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
  const isCompactHeight = viewportHeight <= 620;

  // Detect active virtual keyboard via visualViewport shrink or mobile input focus
  const viewportShrunk = baseH > 0 && viewportHeight < baseH * 0.84;
  const keyboardActive = isMobile && (isFocused || viewportShrunk);

  const topReserve = safeTop + (isMobile ? (isCompactHeight ? 42 : 54) : isCompactHeight ? 48 : 62);
  const bottomReserve = keyboardActive
    ? 10
    : safeBottom + (isMobile ? (isCompactHeight ? 44 : 54) : isCompactHeight ? 46 : 58);
  const usableHeight = Math.max(180, viewportHeight - topReserve - bottomReserve);

  // Bot orbital ring extends ~13.6% outside botSize; guarantee clear space above search bar on mobile, smarthome & desktop
  const botBarGap = isMobile
    ? Math.max(38, Math.round(baseBotSize * ORB_RING_OVERHANG_RATIO) + 16)
    : isCompactHeight
      ? 36
      : 48;
  const quickH = hasQuickLinks ? QUICK_LINKS_HEIGHT : 0;

  if (!keyboardActive) {
    // IDLE / CENTERED STATE (Desktop, Smart Home Displays & Mobile):
    // Center the entire group [bot + gap + searchBar + quickLinks] vertically within the viewport.
    // On desktop/smarthome, reserve space consistently for available suggestions so focusing/blurring never jumps the stage.
    const maxSugs = isCompactHeight ? 1 : 2;
    const reservedSugCount = !isMobile ? Math.min(maxSugs, suggestionCount) : 0;
    const activeSugCount = !isMobile && isFocused ? reservedSugCount : 0;
    const sugH =
      reservedSugCount > 0
        ? SUGGESTION_TOP_GAP + reservedSugCount * SUGGESTION_ROW_HEIGHT + (reservedSugCount - 1) * SUGGESTION_GAP
        : 0;
    const underBarH = Math.max(quickH, sugH);

    // Ensure the bot fits comfortably within usableHeight while keeping proportions balanced
    const maxBotRoom = Math.max(64, usableHeight - botBarGap - BAR_HEIGHT - underBarH);
    const botSize = Math.min(baseBotSize, maxBotRoom);
    const minRingSafeGap = Math.max(24, Math.round(botSize * ORB_RING_OVERHANG_RATIO) + 14);
    const effectiveGap = isMobile
      ? Math.max(36, Math.round(botSize * ORB_RING_OVERHANG_RATIO) + 18)
      : Math.max(botBarGap, minRingSafeGap);
    const groupTotalHeight = botSize + effectiveGap + BAR_HEIGHT + quickH;

    // Exact vertical center in the full viewport, clamped safely against top/bottom bars
    const idealTop = (viewportHeight - groupTotalHeight) / 2;
    const minTop = topReserve;
    const maxTop = Math.max(minTop, viewportHeight - bottomReserve - groupTotalHeight);
    const groupTop = Math.max(minTop, Math.min(maxTop, idealTop));

    return {
      botSize,
      botCenterY: groupTop + botSize / 2,
      uiTopY: groupTop + botSize + effectiveGap,
      scale: botSize / baseBotSize,
      baseBotSize,
      visibleSuggestions: !isMobile && isFocused ? activeSugCount : 0,
      keyboardActive: false,
    };
  }

  // MOBILE KEYBOARD OPEN STATE:
  // Translate the group smoothly upward inside the remaining visualViewport height
  // keeping bot + orbital ring + search bar + (suggestions or quick links) 100% visible with zero ring overlap.
  const minBot = 60;
  const availableTop = safeTop + 14;
  const availableBottom = viewportHeight - 10;
  const roomTotal = Math.max(150, availableBottom - availableTop);
  const reserveGapEstimate = Math.max(32, Math.round(baseBotSize * 0.72 * ORB_RING_OVERHANG_RATIO) + 16);

  // Try fitting up to 2 suggestions (if typing/focused), otherwise drop to 1 or 0
  const maxSugWanted = Math.min(2, suggestionCount);
  for (let n = maxSugWanted; n >= 0; n--) {
    const sugH =
      n > 0 ? SUGGESTION_TOP_GAP + n * SUGGESTION_ROW_HEIGHT + (n - 1) * SUGGESTION_GAP : quickH;
    const roomForBot = roomTotal - reserveGapEstimate - BAR_HEIGHT - sugH;
    if (roomForBot >= minBot || n === 0) {
      const botSize = Math.max(48, Math.min(baseBotSize * 0.72, roomForBot));
      const compactGap = Math.max(30, Math.round(botSize * ORB_RING_OVERHANG_RATIO) + 16);
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

  const fallbackGap = Math.max(30, Math.round(minBot * ORB_RING_OVERHANG_RATIO) + 16);
  return {
    botSize: minBot,
    botCenterY: availableTop + minBot / 2,
    uiTopY: availableTop + minBot + fallbackGap,
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
