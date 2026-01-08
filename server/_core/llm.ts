import { ENV } from "./env";

// التعريفات الأساسية للأنواع (Roles & Contents)
export type Role = "system" | "user" | "assistant" | "tool" | "function";
export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
export type FileContent = { type: "file_url"; file_url: { url: string; mime_type?: string } };
export type MessageContent = string | TextContent | ImageContent | FileContent;
export type Message = { role: Role; content: MessageContent | MessageContent[]; name?: string; tool_call_id?: string };

// إعدادات الأدوات (Tools) والمخرجات (Output Schema)
export type InvokeParams = {
  messages: Message[];
  tools?: any[];
  maxTokens?: number;
  responseFormat?: any;
};

export type InvokeResult = {
  id: string;
  model: string;
  choices: Array<{
    message: { role: Role; content: string; tool_calls?: any[] };
    finish_reason: string | null;
  }>;
};

const ensureArray = (value: any): any[] => (Array.isArray(value) ? value : [value]);

/**
 * تجهيز الرسائل لتناسب Google AI Studio API
 */
const normalizeMessage = (message: Message) => {
  const contentParts = ensureArray(message.content).map(part => {
    if (typeof part === "string") return { type: "text", text: part };
    return part;
  });

  return {
    role: message.role === "assistant" ? "assistant" : message.role,
    content: contentParts.length === 1 && contentParts[0].type === "text" 
      ? contentParts[0].text 
      : contentParts
  };
};

/**
 * تحديد عنوان الـ API
 * نستخدم Google AI Studio v1beta لضمان الوصول لأحدث موديلات Gemini Pro
 */
const resolveApiUrl = () => {
  // إذا كان هناك عنوان مخصص في ENV نستخدمه، وإلا نستخدم العنوان المباشر لجوجل
  return ENV.forgeApiUrl || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
};

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("GEMINI_API_KEY is not configured in .env file");
  }
};

/**
 * الوظيفة الرئيسية لاستدعاء المخ (Gemini Pro)
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const payload: Record<string, unknown> = {
    // تم اختيار 1.5-pro لأنه الأفضل في تحليل الوثائق الطبية والصور التقنية
    model: "gemini-1.5-pro", 
    messages: params.messages.map(normalizeMessage),
    max_tokens: params.maxTokens || 8192, // زيادة سعة الرد للتقارير المفصلة
    temperature: 0.2, // درجة حرارة منخفضة لضمان الدقة الهندسية وعدم "الهلوسة"
  };

  if (params.responseFormat) {
    payload.response_format = params.responseFormat;
  }

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // نمرر المفتاح إما في الهيدر مباشرة أو عبر Bearer token حسب إعدادات الـ Proxy
      "Authorization": `Bearer ${ENV.forgeApiKey}`,
      "x-goog-api-key": ENV.forgeApiKey // إضافة احتياطية لبعض المنافذ
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini API Error:", errorBody);
    throw new Error(`LLM call failed: ${response.status}`);
  }

  return (await response.json()) as InvokeResult;
}
