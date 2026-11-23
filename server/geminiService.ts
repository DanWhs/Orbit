import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  GeminiChatModelId,
  GeminiRoleId,
  ImageAspectRatio,
  LanguageCode,
} from '../src/types/orbit.ts';

export const ORBIT_IMAGE_MODEL = 'gemini-nano-banana-2.1' as const;

const LANGUAGE_INSTRUCTIONS: Record<LanguageCode, string> = {
  it: 'Rispondi sempre in italiano chiaro, naturale e ben strutturato.',
  en: 'Always reply in clear, natural, well-structured English.',
  fr: 'Réponds toujours en français clair, naturel et bien structuré.',
  de: 'Antworte immer auf klarem, natürlichem und gut strukturiertem Deutsch.',
  es: 'Responde siempre en español claro, natural y bien estructurado.',
};

const ROLE_SYSTEM_PERSONAS: Record<Exclude<GeminiRoleId, 'auto'>, string> = {
  assistant:
    'Role: Orb General Companion. Provide balanced, helpful, concise explanations (around 3–6 crisp sentences or clean paragraphs when multi-part) with friendly clarity.',
  fast:
    'Role: Orb Express Helper. Give ultra-fast, direct, zero-fluff answers (1–3 crisp sentences or quick key takeaways).',
  interactive:
    'Role: Orb Interactive Architect. Help with multi-step tasks, code, web workflows, interactive plans, or structured troubleshooting using concrete actionable steps.',
  reasoning:
    'Role: Orb Deep Strategist. Perform rigorous first-principles reasoning, trade-off evaluation, root-cause diagnosis, and careful logical verification before answering.',
};

export interface GeminiAskError extends Error {
  statusCode: number;
  code: 'INVALID_KEY' | 'QUOTA_EXCEEDED' | 'MODEL_UNAVAILABLE' | 'UPSTREAM_ERROR';
}

function makeGeminiError(
  message: string,
  statusCode: number,
  code: GeminiAskError['code']
): GeminiAskError {
  const err = new Error(message) as GeminiAskError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

/**
 * Pure model & role router across Gemini 4 Carbon, Neon, Hydrogen, and 3.1 Flash Lite.
 */
export function selectGeminiModelAndRole(params: {
  role?: GeminiRoleId;
  prompt: string;
}): {
  model: GeminiChatModelId;
  roleUsed: Exclude<GeminiRoleId, 'auto'>;
  thinkingLevel: ThinkingLevel;
} {
  const requested = params.role ?? 'auto';
  if (requested === 'reasoning') {
    return {
      model: 'gemini-4-carbon',
      roleUsed: 'reasoning',
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }
  if (requested === 'interactive') {
    return {
      model: 'gemini-4-neon',
      roleUsed: 'interactive',
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }
  if (requested === 'fast') {
    return {
      model: 'gemini-3.1-flash-lite',
      roleUsed: 'fast',
      thinkingLevel: ThinkingLevel.MINIMAL,
    };
  }
  if (requested === 'assistant') {
    return {
      model: 'gemini-4-hydrogen',
      roleUsed: 'assistant',
      thinkingLevel: ThinkingLevel.MEDIUM,
    };
  }

  // Smart 'auto' task routing based on prompt complexity & task type
  const lower = params.prompt.toLowerCase();
  const deepReasoningRe =
    /\b(architettur|dimostr|dimostra|proof|analyze|analizza|ragionamento|trade-?off|audit|security|sicurezza|complessit|algoritmo|root cause|diagnos|strategy|strategia|compare|confronta dettagliat)\b/i;
  const complexInteractiveRe =
    /\b(code|codice|typescript|javascript|python|react|css|html|sql|api|script|funzione|component|build|debug|regex|formula|equazione|calcola|step by step|passo dopo passo)\b/i;
  const fastQuickRe =
    /^(cosa significa|cos['’]?è|chi è|dove si trova|definisci|traduci|riassumi|what is|define|translate|summarize|synonym|sinonimo|quanti|quando)(?=\s|[?!.,:;]|$)/i;

  if (deepReasoningRe.test(lower) || lower.length > 420) {
    return {
      model: 'gemini-4-carbon',
      roleUsed: 'reasoning',
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }
  if (complexInteractiveRe.test(lower)) {
    return {
      model: 'gemini-4-neon',
      roleUsed: 'interactive',
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }
  if (fastQuickRe.test(lower) && lower.length < 110) {
    return {
      model: 'gemini-3.1-flash-lite',
      roleUsed: 'fast',
      thinkingLevel: ThinkingLevel.MINIMAL,
    };
  }

  return {
    model: 'gemini-4-hydrogen',
    roleUsed: 'assistant',
    thinkingLevel: ThinkingLevel.MEDIUM,
  };
}

function createByokGeminiClient(userApiKey: string): GoogleGenAI {
  // Strictly uses ONLY the user-supplied BYOK key from the encrypted vault — never process.env
  return new GoogleGenAI({
    apiKey: userApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapUpstreamGeminiError(rawErr: unknown): GeminiAskError {
  if ((rawErr as GeminiAskError)?.code) {
    return rawErr as GeminiAskError;
  }
  const msg = rawErr instanceof Error ? rawErr.message : String(rawErr);
  const upper = msg.toUpperCase();
  if (
    upper.includes('API_KEY_INVALID') ||
    upper.includes('API KEY NOT VALID') ||
    upper.includes('PERMISSION_DENIED') ||
    upper.includes('401') ||
    upper.includes('403')
  ) {
    return makeGeminiError(
      'Gemini rejected your personal API key. Check your key in Settings -> Features AI.',
      401,
      'INVALID_KEY'
    );
  }
  if (upper.includes('RESOURCE_EXHAUSTED') || upper.includes('429') || upper.includes('QUOTA')) {
    return makeGeminiError(
      'Gemini rate limit or quota exceeded (429) on your API key. Retry shortly or check your Google AI Studio quota.',
      429,
      'QUOTA_EXCEEDED'
    );
  }
  if (upper.includes('NOT_FOUND') || upper.includes('404')) {
    return makeGeminiError('Requested Gemini model endpoint unavailable (404).', 502, 'MODEL_UNAVAILABLE');
  }
  return makeGeminiError('Unable to reach Gemini right now.', 502, 'UPSTREAM_ERROR');
}

export async function askOrbitGemini(params: {
  apiKey: string;
  prompt: string;
  lang: LanguageCode;
  role?: GeminiRoleId;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
}): Promise<{ answer: string; model: GeminiChatModelId; roleUsed: Exclude<GeminiRoleId, 'auto'> }> {
  const cleanPrompt = params.prompt.trim().slice(0, 2000);
  if (!cleanPrompt) {
    throw makeGeminiError('Empty query', 400, 'UPSTREAM_ERROR');
  }

  const ai = createByokGeminiClient(params.apiKey);
  const { model, roleUsed, thinkingLevel } = selectGeminiModelAndRole({
    role: params.role,
    prompt: cleanPrompt,
  });

  const langGuide = LANGUAGE_INSTRUCTIONS[params.lang] ?? LANGUAGE_INSTRUCTIONS.en;
  const personaGuide = ROLE_SYSTEM_PERSONAS[roleUsed];
  const systemInstruction = [
    'You are Orb, the assistant inside Orbit Search.',
    personaGuide,
    langGuide,
    'Maintain conversational context accurately across turns.',
    'Never invent live real-time facts you do not know; state clearly what is general knowledge vs a live check.',
    'Keep formatting clean and readable without noisy markdown boilerplate.',
  ].join(' ');

  const sanitizedHistory = Array.isArray(params.history)
    ? params.history
        .filter(
          (item) =>
            item &&
            (item.role === 'user' || item.role === 'model') &&
            typeof item.text === 'string' &&
            item.text.trim().length > 0
        )
        .slice(-12)
        .map((item) => ({
          role: item.role,
          parts: [{ text: item.text.trim().slice(0, 1500) }],
        }))
    : [];

  try {
    const chat = ai.chats.create({
      model,
      history: sanitizedHistory,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel },
      },
    });
    const response = await chat.sendMessage({ message: cleanPrompt });

    const answer = (response.text ?? '').trim();
    if (!answer) {
      throw makeGeminiError('Empty response from Gemini', 502, 'UPSTREAM_ERROR');
    }
    return {
      answer,
      model,
      roleUsed,
    };
  } catch (rawErr: unknown) {
    throw mapUpstreamGeminiError(rawErr);
  }
}

const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_ASPECT_RATIOS = new Set<ImageAspectRatio>(['1:1', '16:9', '9:16', '4:3', '3:4']);

export async function generateOrEditOrbitImage(params: {
  apiKey: string;
  prompt: string;
  aspectRatio?: ImageAspectRatio;
  sourceImageBase64?: string;
  sourceMimeType?: string;
}): Promise<{ imageUrl: string; text?: string; model: typeof ORBIT_IMAGE_MODEL }> {
  const cleanPrompt = params.prompt.trim().slice(0, 1200);
  if (!cleanPrompt) {
    throw makeGeminiError('Prompt is required to create or edit an image.', 400, 'UPSTREAM_ERROR');
  }

  const ratio: ImageAspectRatio =
    params.aspectRatio && ALLOWED_ASPECT_RATIOS.has(params.aspectRatio) ? params.aspectRatio : '1:1';

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (params.sourceImageBase64) {
    const cleanB64 = params.sourceImageBase64.replace(/^data:[^;]+;base64,/, '').trim();
    const mime = (params.sourceMimeType || 'image/png').toLowerCase();
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      throw makeGeminiError('Unsupported source image format (use PNG, JPEG, or WebP).', 400, 'UPSTREAM_ERROR');
    }
    if (cleanB64.length > 9_000_000) {
      throw makeGeminiError('Source image exceeds size limit.', 400, 'UPSTREAM_ERROR');
    }
    parts.push({
      inlineData: {
        data: cleanB64,
        mimeType: mime,
      },
    });
  }

  parts.push({ text: cleanPrompt });

  const ai = createByokGeminiClient(params.apiKey);

  try {
    const response = await ai.models.generateContent({
      model: ORBIT_IMAGE_MODEL,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: ratio,
          imageSize: '1K',
        },
      },
    });

    const outParts = response.candidates?.[0]?.content?.parts ?? [];
    let imageUrl = '';
    const textChunks: string[] = [];

    for (const part of outParts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textChunks.push(part.text.trim());
      }
    }

    if (!imageUrl) {
      throw makeGeminiError('Gemini did not return an image for this prompt.', 502, 'UPSTREAM_ERROR');
    }

    return {
      imageUrl,
      text: textChunks.filter(Boolean).join('\n') || undefined,
      model: ORBIT_IMAGE_MODEL,
    };
  } catch (rawErr: unknown) {
    throw mapUpstreamGeminiError(rawErr);
  }
}
