import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUp,
  Download,
  Image as ImageIcon,
  MessageSquare,
  Pencil,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type {
  AiChatMessage,
  AiStatusResponse,
  GeminiRoleId,
  ImageAspectRatio,
} from '../types/orbit';
import type { UiDictionary } from '../i18n/translations';
import { BubbleButton } from './LiquidBubble';

export interface AttachedReferenceImage {
  dataUrl: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  base64: string;
  name?: string;
}

interface OrbChatPanelProps {
  open: boolean;
  mode: 'chat' | 'image';
  role: GeminiRoleId;
  aspectRatio: ImageAspectRatio;
  attachedImage: AttachedReferenceImage | null;
  messages: AiChatMessage[];
  loading: boolean;
  aiStatus: AiStatusResponse;
  dict: UiDictionary;
  onModeChange: (mode: 'chat' | 'image') => void;
  onRoleChange: (role: GeminiRoleId) => void;
  onAspectRatioChange: (ratio: ImageAspectRatio) => void;
  onAttachImage: (img: AttachedReferenceImage | null) => void;
  onSendMessage: (prompt: string) => void;
  onStartEditGeneratedImage: (imageUrl: string) => void;
  onBackToSearch: () => void;
  onOpenAiSettings: () => void;
}

const ASPECT_RATIOS: ImageAspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export const OrbChatPanel = memo(function OrbChatPanel({
  open,
  mode,
  role,
  aspectRatio,
  attachedImage,
  messages,
  loading,
  aiStatus,
  dict,
  onModeChange,
  onRoleChange,
  onAspectRatioChange,
  onAttachImage,
  onSendMessage,
  onStartEditGeneratedImage,
  onBackToSearch,
  onOpenAiSettings,
}: OrbChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setDraft('');
      return;
    }
    const timer = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 180);
    return () => clearTimeout(timer);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [open, messages.length, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBackToSearch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onBackToSearch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean || loading) return;
    setDraft('');
    onSendMessage(clean);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const mime = file.type;
    if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp') {
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      if (commaIdx <= 0) return;
      const base64 = result.slice(commaIdx + 1);
      onAttachImage({
        dataUrl: result,
        mimeType: mime,
        base64,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const roleOptions: Array<{ id: GeminiRoleId; label: string }> = [
    { id: 'auto', label: dict.aiRoleAuto },
    { id: 'assistant', label: `${dict.aiRoleAssistant} · Hydrogen` },
    { id: 'fast', label: `${dict.aiRoleFast} · Flash Lite` },
    { id: 'interactive', label: `${dict.aiRoleInteractive} · Neon` },
    { id: 'reasoning', label: `${dict.aiRoleReasoning} · Carbon` },
  ];

  const getRoleBadgeLabel = (badge?: AiChatMessage['roleBadge']) => {
    switch (badge) {
      case 'fast':
        return dict.aiRoleFast;
      case 'interactive':
        return dict.aiRoleInteractive;
      case 'reasoning':
        return dict.aiRoleReasoning;
      case 'assistant':
        return dict.aiRoleAssistant;
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-20 flex items-end justify-center md:items-center md:justify-end p-2.5 sm:p-4 pt-[116px] md:pt-12 pb-[max(12px,var(--sb))] md:pr-8 lg:pr-14 pointer-events-none">
          <motion.section
            role="region"
            aria-label={dict.aiChatTitle}
            data-testid="ai-chat-panel"
            initial={{ opacity: 0, x: 22, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 18, y: 10, scale: 0.985 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 pointer-events-auto w-full md:w-[min(580px,54vw)] h-[min(540px,calc(100vh-132px))] md:h-[min(640px,calc(100vh-72px))] flex flex-col rounded-[28px] overflow-hidden backdrop-blur-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg) 74%, var(--menu-glass))',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              willChange: 'transform, opacity',
              contain: 'layout style paint',
            }}
          >
            {/* Header with Back Arrow returning to Search Engine + Chat/Image Switcher */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 border-b shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <BubbleButton
                type="button"
                variant="glass"
                tabIndex={0}
                data-testid="ai-chat-back-btn"
                aria-label={dict.aiChatBackToSearch}
                onClick={onBackToSearch}
                contentClassName="flex items-center justify-center gap-2 w-full h-full leading-none"
                className="h-9 px-3 rounded-full text-[12.5px] sm:text-[13px] font-medium cursor-pointer hover:bg-[var(--glass2)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                style={{
                  backgroundColor: 'var(--glass)',
                  color: 'var(--fg)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap leading-none">{dict.aiChatBackToSearch}</span>
              </BubbleButton>

              {/* Mode Switcher: Chat vs Nano Banana 2.1 Images */}
              <div
                role="tablist"
                aria-label={dict.aiChatTitle}
                className="inline-flex items-center gap-1 p-1 rounded-full"
                style={{
                  backgroundColor: 'var(--glass)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  role="tab"
                  tabIndex={0}
                  aria-selected={mode === 'chat'}
                  data-testid="ai-mode-chat-tab"
                  onClick={() => onModeChange('chat')}
                  className="h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-[11.5px] font-semibold cursor-pointer transition-colors"
                  style={{
                    backgroundColor: mode === 'chat' ? 'var(--acc)' : 'transparent',
                    color: mode === 'chat' ? 'var(--acc-fg)' : 'var(--mut)',
                  }}
                >
                  <MessageSquare className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{dict.aiChatModeChat}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  tabIndex={0}
                  aria-selected={mode === 'image'}
                  data-testid="ai-mode-image-tab"
                  onClick={() => onModeChange('image')}
                  className="h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-[11.5px] font-semibold cursor-pointer transition-colors"
                  style={{
                    backgroundColor: mode === 'image' ? 'var(--acc)' : 'transparent',
                    color: mode === 'image' ? 'var(--acc-fg)' : 'var(--mut)',
                  }}
                >
                  <ImageIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{dict.aiChatModeImage}</span>
                </button>
              </div>

              <div
                className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-medium min-w-0"
                style={{ color: 'var(--mut)' }}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--acc-text)' }} aria-hidden="true" />
                <span className="whitespace-nowrap">
                  {mode === 'image' ? 'Nano Banana 2.1' : 'Gemini 4'} · {dict.betaTag}
                </span>
              </div>
            </div>

            {/* Secondary Capability Strip: Role/Model Routing OR Image Aspect Ratio & Upload */}
            <div
              className="px-3.5 sm:px-5 py-2 border-b flex items-center gap-1.5 overflow-x-auto orbit-scroll shrink-0"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'rgba(var(--acc-rgb), 0.025)' }}
            >
              {mode === 'chat' ? (
                <>
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.05em] shrink-0 mr-1"
                    style={{ color: 'var(--mut)' }}
                  >
                    {dict.aiRoleLabel}:
                  </span>
                  {roleOptions.map((opt) => {
                    const active = role === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        tabIndex={0}
                        data-testid={`ai-role-pill-${opt.id}`}
                        aria-pressed={active}
                        onClick={() => onRoleChange(opt.id)}
                        className="h-7 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                        style={{
                          backgroundColor: active ? 'rgba(var(--acc-rgb), 0.16)' : 'var(--glass)',
                          color: active ? 'var(--acc-text)' : 'var(--mut)',
                          boxShadow: active
                            ? 'inset 0 0 0 1px rgba(var(--acc-rgb), 0.45)'
                            : 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </>
              ) : (
                <>
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.05em] shrink-0 mr-1"
                    style={{ color: 'var(--mut)' }}
                  >
                    {dict.aiImageRatioLabel}:
                  </span>
                  {ASPECT_RATIOS.map((r) => {
                    const active = aspectRatio === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        tabIndex={0}
                        data-testid={`ai-ratio-pill-${r}`}
                        aria-pressed={active}
                        onClick={() => onAspectRatioChange(r)}
                        className="h-7 px-2.5 rounded-full text-[11px] font-semibold tabular-nums shrink-0 cursor-pointer transition-colors"
                        style={{
                          backgroundColor: active ? 'rgba(var(--acc-rgb), 0.16)' : 'var(--glass)',
                          color: active ? 'var(--acc-text)' : 'var(--mut)',
                          boxShadow: active
                            ? 'inset 0 0 0 1px rgba(var(--acc-rgb), 0.45)'
                            : 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    data-testid="ai-image-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-auto h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:bg-[var(--glass2)]"
                    style={{
                      backgroundColor: 'var(--glass)',
                      color: 'var(--fg)',
                      boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                    }}
                  >
                    <Upload className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{dict.aiImageUploadLabel}</span>
                  </button>
                </>
              )}
            </div>

            {/* Conversation Feed */}
            <div
              ref={scrollRef}
              data-testid="ai-chat-messages"
              className="flex-1 overflow-y-auto orbit-scroll px-4 sm:px-5 py-3.5 space-y-3.5 select-text"
            >
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div
                        data-testid="ai-chat-msg-user"
                        className="max-w-[85%] px-4 py-2.5 rounded-[20px] text-[13.5px] sm:text-[14px] leading-relaxed space-y-2"
                        style={{
                          backgroundColor: 'rgba(var(--acc-rgb), 0.14)',
                          color: 'var(--fg)',
                          boxShadow: 'inset 0 0 0 1px rgba(var(--acc-rgb), 0.25)',
                        }}
                      >
                        {msg.sourceImageUrl && (
                          <img
                            src={msg.sourceImageUrl}
                            alt=""
                            className="max-h-28 rounded-xl object-cover border"
                            style={{ borderColor: 'rgba(var(--acc-rgb), 0.25)' }}
                          />
                        )}
                        <div>{msg.text}</div>
                      </div>
                    </div>
                  );
                }

                if (msg.role === 'error') {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div
                        data-testid="ai-chat-msg-error"
                        className="max-w-[90%] px-4 py-3 rounded-[20px] space-y-2.5 text-[13.5px] leading-relaxed"
                        style={{
                          backgroundColor: 'var(--glass)',
                          color: 'var(--mut)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        <p className="m-0">{msg.text}</p>
                        {msg.needKey && !aiStatus.connected && (
                          <BubbleButton
                            variant="solid"
                            tabIndex={0}
                            data-testid="ai-answer-open-settings-btn"
                            onClick={onOpenAiSettings}
                            contentClassName="flex items-center justify-center w-full h-full leading-none"
                            className="h-9 px-4 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97]"
                            style={{
                              backgroundColor: 'var(--acc)',
                              color: 'var(--acc-fg)',
                            }}
                          >
                            <span>
                              {dict.settingsTabAi} ({dict.betaTag})
                            </span>
                          </BubbleButton>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex justify-start">
                    <div
                      data-testid="ai-chat-msg-assistant"
                      className="max-w-[92%] px-4 py-3 rounded-[20px] text-[13.5px] sm:text-[14px] leading-[1.68] space-y-2.5"
                      style={{
                        backgroundColor: 'var(--glass)',
                        color: 'var(--fg)',
                        boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                      }}
                    >
                      {msg.imageUrl && (
                        <div className="space-y-2">
                          <img
                            src={msg.imageUrl}
                            alt={msg.text || 'Generated image'}
                            data-testid="ai-generated-image"
                            className="w-full max-h-[290px] object-contain rounded-2xl bg-black/15"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              tabIndex={0}
                              onClick={() => onStartEditGeneratedImage(msg.imageUrl!)}
                              className="h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[11.5px] font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                              style={{
                                backgroundColor: 'rgba(var(--acc-rgb), 0.14)',
                                color: 'var(--acc-text)',
                                boxShadow: 'inset 0 0 0 1px rgba(var(--acc-rgb), 0.35)',
                              }}
                            >
                              <Pencil className="w-3 h-3" aria-hidden="true" />
                              <span>{dict.aiImageEditBtn}</span>
                            </button>
                            <a
                              href={msg.imageUrl}
                              download={`orbit-image-${Date.now()}.png`}
                              tabIndex={0}
                              className="h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[11.5px] font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                              style={{
                                backgroundColor: 'var(--glass2)',
                                color: 'var(--fg)',
                                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                                textDecoration: 'none',
                              }}
                            >
                              <Download className="w-3 h-3" aria-hidden="true" />
                              <span>{dict.aiImageDownloadBtn}</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {msg.text && <div className="whitespace-pre-line">{msg.text}</div>}

                      {(msg.model || msg.roleBadge) && (
                        <div
                          className="pt-1.5 border-t flex flex-wrap items-center gap-1.5 text-[10.5px] font-medium"
                          style={{ borderColor: 'var(--border-subtle)', color: 'var(--mut)' }}
                        >
                          {msg.roleBadge && (
                            <span style={{ color: 'var(--acc-text)' }}>
                              {getRoleBadgeLabel(msg.roleBadge)}
                            </span>
                          )}
                          {msg.roleBadge && msg.model && <span aria-hidden="true">·</span>}
                          {msg.model && <span className="font-mono opacity-80">{msg.model}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start" data-testid="ai-chat-loading">
                  <div
                    className="px-4 py-2.5 rounded-[20px] text-[13px] animate-pulse"
                    style={{
                      backgroundColor: 'var(--glass)',
                      color: 'var(--mut)',
                      boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                    }}
                  >
                    {mode === 'image' ? dict.aiImageLoading : dict.aiAnswerLoading}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Follow-up Composer + Attached Reference Image Preview */}
            <div
              className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-t shrink-0 space-y-2"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {mode === 'image' && attachedImage && (
                <div
                  data-testid="ai-image-attached-bar"
                  className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-2xl"
                  style={{
                    backgroundColor: 'rgba(var(--acc-rgb), 0.1)',
                    boxShadow: 'inset 0 0 0 1px rgba(var(--acc-rgb), 0.28)',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={attachedImage.dataUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--fg)' }}>
                      {attachedImage.name || dict.aiImageEditingBanner}
                    </span>
                  </div>
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={dict.aiImageClearUpload}
                    onClick={() => onAttachImage(null)}
                    className="w-7 h-7 rounded-full grid place-items-center shrink-0 cursor-pointer hover:bg-[var(--glass2)]"
                    style={{ color: 'var(--mut)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleFormSubmit}
                className="flex items-center gap-2 h-[46px] pl-4 pr-1.5 rounded-full backdrop-blur-lg"
                style={{
                  backgroundColor: 'var(--glass2)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  tabIndex={0}
                  data-testid="ai-chat-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={mode === 'image' ? dict.aiImagePlaceholder : dict.aiChatInputPlaceholder}
                  aria-label={mode === 'image' ? dict.aiImagePlaceholder : dict.aiChatInputPlaceholder}
                  className="flex-1 min-w-0 h-full bg-transparent border-0 outline-none text-[14px] font-normal placeholder:text-[var(--mut)]"
                  style={{
                    color: 'var(--fg)',
                    caretColor: 'var(--acc)',
                  }}
                />
                <BubbleButton
                  type="submit"
                  variant="solid"
                  tabIndex={0}
                  disabled={!draft.trim() || loading}
                  data-testid="ai-chat-send-btn"
                  aria-label={dict.aiChatSendAria}
                  contentClassName="grid place-items-center w-full h-full"
                  className="w-9 h-9 rounded-full shrink-0 cursor-pointer transition-opacity active:scale-90 disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                  style={{
                    backgroundColor: 'var(--acc)',
                    color: 'var(--acc-fg)',
                  }}
                >
                  <ArrowUp className="w-4 h-4" aria-hidden="true" />
                </BubbleButton>
              </form>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
});
