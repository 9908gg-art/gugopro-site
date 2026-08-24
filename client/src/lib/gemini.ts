/** Dark Glass BYOK: no keys are embedded; every request uses the visitor's local browser key. */
export type GeminiTurn = { role: "user" | "model"; text: string };

const endpointFor = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

export async function generateGeminiText({
  apiKey,
  systemInstruction,
  history,
  userText,
  temperature = 0.55,
  maxOutputTokens = 2400,
}: {
  apiKey: string;
  systemInstruction: string;
  history: GeminiTurn[];
  userText: string;
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const response = await fetch(endpointFor(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        ...history.slice(-16).map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        { role: "user", parts: [{ text: userText }] },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature, maxOutputTokens },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini API 請求失敗（HTTP ${response.status}）`);
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("\n").trim();
  if (!text) throw new Error("Gemini 未回傳可顯示的文字內容，請調整輸入後再試一次。 ");
  return text;
}

export async function inspectGeminiKey(apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini API 連線失敗（HTTP ${response.status}）`);
  return Array.isArray(payload?.models) ? payload.models.length : 0;
}

export function saveTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}
