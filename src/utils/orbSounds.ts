import type {
  BotReactionType,
  OrbAudioProfile,
  OrbPresenceState,
  OrbitUiSoundType,
  ToneSpec,
} from '../types/orbit';

let sharedAudioCtx: AudioContext | null = null;
let audioUnlocked = false;
let cachedProfile: OrbAudioProfile | null = null;
let profileLoadPromise: Promise<OrbAudioProfile | null> | null = null;

function ensureAudioProfile(): void {
  if (cachedProfile || profileLoadPromise) return;
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  profileLoadPromise = fetch('/api/orb/audio-profile')
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as OrbAudioProfile;
      cachedProfile = json;
      return json;
    })
    .catch(() => null);
}

function getAudioContext(createIfMissing: boolean): AudioContext | null {
  if (typeof window === 'undefined') return null;
  ensureAudioProfile();
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx && createIfMissing) {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended' && createIfMissing) {
      void sharedAudioCtx.resume().catch(() => {});
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
      audioUnlocked = true;
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function unlockOrbitAudio(): void {
  const ctx = getAudioContext(true);
  if (ctx && ctx.state === 'running') {
    audioUnlocked = true;
  }
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  dur = 0.13,
  freqEnd?: number,
  gainPeak = 0.028,
  delayMs = 0
): void {
  try {
    const t = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur * 0.85);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(gainPeak, t + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.025);
  } catch {
    // Ignore browser audio errors
  }
}

function playSequence(specs: ToneSpec[] | undefined, onlyIfUnlocked = false, scaleGain = 1): void {
  if (!specs || specs.length === 0) return;
  const ctx = getAudioContext(!onlyIfUnlocked);
  if (!ctx) return;
  if (onlyIfUnlocked && ctx.state !== 'running' && !audioUnlocked) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  for (const [f0, dur, f1, peak = 0.026, delay = 0] of specs) {
    scheduleTone(ctx, f0, dur, f1, peak * scaleGain, delay);
  }
}

export function setLoadedAudioProfile(profile: OrbAudioProfile): void {
  cachedProfile = profile;
}

export function playReactionSound(type: BotReactionType, ambient = false): void {
  ensureAudioProfile();
  const specs = cachedProfile?.reactions?.[type];
  playSequence(specs, ambient, ambient ? 0.55 : 1);
}

export function playPresenceSound(state: OrbPresenceState): void {
  if (state === 'awake') return;
  ensureAudioProfile();
  const specs = cachedProfile?.presence?.[state];
  playSequence(specs, true, 1);
}

export function playUiSound(type: OrbitUiSoundType): void {
  ensureAudioProfile();
  const specs = cachedProfile?.ui?.[type];
  playSequence(specs, false, 1);
}
