/** Signal Atelier: the GuGoPro catalog keeps product vocabulary concise, comparable, and trust-oriented. */
export type ToolSlug =
  | "language-tutor"
  | "live-translation"
  | "tarot-master"
  | "gemini-quota"
  | "amazon-research"
  | "nutritionist"
  | "fitness-coach";

export type AiTool = {
  slug: ToolSlug;
  index: string;
  category: string;
  title: string;
  shortTitle: string;
  description: string;
  promptLead: string;
  promptHint: string;
  safetyNote?: string;
  legacyUrl: string;
};

export const TOOLS: AiTool[] = [
  { slug: "language-tutor", index: "01", category: "Language Lab", title: "AI 多國語言導師", shortTitle: "多國語言導師", description: "多國語言實時對話、文法糾錯與情境口語練習，將每次練習轉成可行動的修正。", promptLead: "請依照我輸入的語言與情境，扮演鼓勵且精確的語言導師。請先自然回覆，再條列修正我的文法與用字，最後給一個延伸練習問題。", promptHint: "例如：我想以日文練習在咖啡店點餐。請糾正這句：...", legacyUrl: "https://gugopro.com/tools/ai/english-speaking-tutor.html" },
  { slug: "live-translation", index: "02", category: "Translation", title: "AI 同聲傳譯", shortTitle: "即時翻譯", description: "支援多語言文字即時雙向互譯，並依對話脈絡提供更自然、得體的語境修飾。", promptLead: "你是專業即時口譯與在地化編輯。請忠實翻譯下列內容，保留語氣與意圖；接著提供一個更自然的口語版本與一句簡短的語境提醒。", promptHint: "輸入需要翻譯的文字，並在上方選擇來源與目標語言。", legacyUrl: "https://gugopro.com/tools/ai/realtime-translator.html" },
  { slug: "tarot-master", index: "03", category: "Reflection", title: "AI 塔羅牌大師", shortTitle: "塔羅牌大師", description: "以牌陣占卜、心理投射解析與追問引導，協助你整理想法，而非替你做出人生決定。", promptLead: "請以溫和、反思導向的塔羅引導者身分，為我進行一個象徵性牌陣解讀。請清楚說明這是娛樂與自我反思用途，不做確定預言、不替使用者做醫療、法律、財務或人生決策。", promptHint: "例如：我想釐清是否該接受新的工作機會；我目前最在意的是...", safetyNote: "塔羅內容只適合作為自我反思與娛樂參考，不構成專業建議或保證。", legacyUrl: "https://gugopro.com/tools/ai/tarot-master.html" },
  { slug: "gemini-quota", index: "04", category: "Developer Tool", title: "Gemini API 額度與用量查詢", shortTitle: "Gemini API 檢測", description: "在瀏覽器本機測試 API Key 是否可用、讀取可見模型，並保留僅屬於此瀏覽器的呼叫紀錄。", promptLead: "", promptHint: "設定 API Key 後即可進行安全的本機連線檢測。", legacyUrl: "https://gugopro.com/tools/tutorials/how-to-get-gemini-api-key.html" },
  { slug: "amazon-research", index: "05", category: "Commerce Intel", title: "亞馬遜 AI 智能選品助手", shortTitle: "Amazon 選品助手", description: "協助拆解受眾、競品空缺、選品風險與商品賣點，將模糊方向整理成下一步研究假設。", promptLead: "你是嚴謹的亞馬遜選品研究助理。根據我的品類與市場假設，整理受眾、關鍵需求、差異化可能性、驗證事項與風險。請不要捏造即時銷售量、評論或市場數據；請明確列出仍需外部驗證的假設。", promptHint: "例如：美國站、可重複使用的嬰兒餐具；我想知道...", legacyUrl: "https://gugopro.com/amazon/" },
  { slug: "nutritionist", index: "06", category: "Wellbeing", title: "AI 專屬營養師", shortTitle: "專屬營養師", description: "依照目標與飲食偏好建立可執行的飲食規劃、熱量與營養素估算方向。", promptLead: "你是重視安全界線的健康飲食規劃助理。請根據目標、偏好與限制提供一般健康飲食建議、均衡餐盤方向與可追蹤習慣。不要診斷疾病、不要取代醫師或註冊營養師；若出現醫療、孕哺、飲食疾患或特殊病況，請建議諮詢合格專業人員。", promptHint: "例如：我想以全素飲食提升蛋白質攝取；我的活動量與偏好是...", safetyNote: "本工具僅提供一般健康資訊，不取代醫療診斷、治療或專業營養諮詢。", legacyUrl: "https://gugopro.com/tools/ai/nutrition-meal-planner.html" },
  { slug: "fitness-coach", index: "07", category: "Wellbeing", title: "AI 減肥瘦身教練", shortTitle: "減肥瘦身教練", description: "建立客製化體態管理、減脂週期計畫與循序漸進的運動處方建議。", promptLead: "你是安全優先的健身與體態管理教練。請依據一般目標、時間與可用設備提出循序漸進的運動與習慣計畫，避免極端節食、過度訓練或醫療承諾。若有疼痛、慢性疾病、懷孕、術後或飲食疾患相關情況，請先建議使用者尋求合格醫療或運動專業協助。", promptHint: "例如：我每週可運動 3 次、每次 40 分鐘，只有彈力帶；我希望...", safetyNote: "本工具只提供一般運動與生活型態資訊；如有健康狀況或不適，請先諮詢合格專業人員。", legacyUrl: "https://gugopro.com/tools/health/weight-loss-planner.html" },
];

export type ModelRecord = { id: string; name: string; provider: string; context: number; input: number | null; output: number | null; modalities: string[]; reasoning: number; source: string; sourceLabel: string; };

/** Curated fallback only; the live explorer refreshes from models.dev in the browser whenever available. */
export const FALLBACK_MODELS: ModelRecord[] = [
  { id: "gemini-1-5-flash", name: "Gemini 1.5 Flash", provider: "Google", context: 1_000_000, input: 0.075, output: 0.3, modalities: ["文字", "視覺", "音訊", "代碼"], reasoning: 76, source: "https://ai.google.dev/pricing", sourceLabel: "Google AI" },
  { id: "gemini-1-5-pro", name: "Gemini 1.5 Pro", provider: "Google", context: 2_000_000, input: 1.25, output: 5, modalities: ["文字", "視覺", "音訊", "代碼"], reasoning: 88, source: "https://ai.google.dev/pricing", sourceLabel: "Google AI" },
  { id: "gemini-2-5-flash", name: "Gemini 2.5 Flash", provider: "Google", context: 1_000_000, input: 0.3, output: 2.5, modalities: ["文字", "視覺", "音訊", "代碼"], reasoning: 84, source: "https://ai.google.dev/pricing", sourceLabel: "Google AI" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", context: 128_000, input: 2.5, output: 10, modalities: ["文字", "視覺", "音訊", "代碼"], reasoning: 82, source: "https://openai.com/api/pricing/", sourceLabel: "OpenAI" },
  { id: "gpt-4-1", name: "GPT-4.1", provider: "OpenAI", context: 1_000_000, input: 2, output: 8, modalities: ["文字", "視覺", "代碼"], reasoning: 86, source: "https://openai.com/api/pricing/", sourceLabel: "OpenAI" },
  { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", context: 200_000, input: 3, output: 15, modalities: ["文字", "視覺", "代碼"], reasoning: 91, source: "https://www.anthropic.com/pricing", sourceLabel: "Anthropic" },
  { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", context: 200_000, input: 0.8, output: 4, modalities: ["文字", "視覺", "代碼"], reasoning: 74, source: "https://www.anthropic.com/pricing", sourceLabel: "Anthropic" },
  { id: "deepseek-v3", name: "DeepSeek-V3", provider: "DeepSeek", context: 128_000, input: 0.27, output: 1.1, modalities: ["文字", "代碼"], reasoning: 83, source: "https://api-docs.deepseek.com/quick_start/pricing", sourceLabel: "DeepSeek" },
  { id: "deepseek-r1", name: "DeepSeek-R1", provider: "DeepSeek", context: 128_000, input: 0.55, output: 2.19, modalities: ["文字", "代碼"], reasoning: 90, source: "https://api-docs.deepseek.com/quick_start/pricing", sourceLabel: "DeepSeek" },
  { id: "llama-3-3-70b", name: "Llama 3.3 70B", provider: "Meta", context: 128_000, input: 0.88, output: 0.88, modalities: ["文字", "代碼"], reasoning: 78, source: "https://www.llama.com/", sourceLabel: "Meta" },
  { id: "llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta", context: 1_000_000, input: null, output: null, modalities: ["文字", "視覺", "代碼"], reasoning: 85, source: "https://www.llama.com/", sourceLabel: "Meta" },
];

export const getTool = (slug: string) => TOOLS.find((tool) => tool.slug === slug);
