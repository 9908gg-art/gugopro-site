/** Dark Glass BYOK workspace: new React tools are browser-only and do not modify the protected legacy files. */
import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import { Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Bot, CheckCircle2, Copy, Dices, Download, Flame, Gauge, LoaderCircle, LockKeyhole, Mic, MicOff, RotateCcw, Send, ShieldCheck, Sparkles, Trash2, Volume2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import SiteShell from "@/components/SiteShell";
import { getTool } from "@/lib/catalog";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { generateGeminiText, inspectGeminiKey, saveTextFile, type GeminiTurn } from "@/lib/gemini";
import { drawTarotCards, type TarotCard } from "@/lib/tarot";
import "./tool-workspace.css";
import "./tool-instrument.css";

type ChatMessage = GeminiTurn & { id: string; createdAt: string };
type HealthProfile = { gender: "male" | "female"; age: number; height: number; weight: number; activity: number; goal: string; dietary: string };
type BrowserRecognition = { lang: string; interimResults: boolean; continuous: boolean; onstart: (() => void) | null; onend: (() => void) | null; onerror: (() => void) | null; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; start: () => void; };
type BrowserRecognitionConstructor = new () => BrowserRecognition;
const iconBySlug = { "language-tutor": Bot, "live-translation": Volume2, "tarot-master": Sparkles, "gemini-quota": Gauge, "amazon-research": Activity, "nutritionist": Flame, "fitness-coach": Activity } as const;
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const defaultHealth: HealthProfile = { gender: "male", age: 28, height: 175, weight: 70, activity: 1.55, goal: "溫和減脂", dietary: "無" };

function calculateTdee(profile: HealthProfile) {
  const bmr = profile.gender === "male" ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5 : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
  return Math.round(bmr * profile.activity);
}

function systemFor(slug: string, health: HealthProfile, cards: TarotCard[], language: string) {
  const safety = "不可將內容視為醫療、法律、財務或保證結果；資料不足時要明確說明限制。";
  if (slug === "language-tutor") return `你是專業多國語言家教。學生目前選定的練習通道是 ${language}；支援繁中、英文、日文、韓文與西文，以此目標語言自然多輪對話。每次回覆依序給出：自然回覆、文法與用字修正、發音或重音提示、下一個情境追問。保持鼓勵而具體。`;
  if (slug === "live-translation") return `你是高擬真即時口譯與在地化編輯。翻譯方向為 ${language}。請先輸出「翻譯」，再輸出「自然口語版」與「發音註記／語境提醒」。保留原意、禮貌程度和專有名詞。`;
  if (slug === "tarot-master") return `你是反思導向的塔羅解讀引導者。已抽到的牌：${cards.map((card, index) => `${index + 1}. ${card.name}（${card.orientation}）`).join("；")}。請以 Markdown 的 ## 牌面解析、## 深層寓意、## 行動指引、## 反思提問 四段輸出；不做確定預言，也不替使用者做重要決策。${safety}`;
  if (slug === "amazon-research") return "你是嚴謹的 Amazon 選品研究助理。根據使用者的品類與市場假設，整理受眾、需求、差異化、待驗證假設與風險。不得捏造即時銷售量、評論或市場數據，請清楚區分推測與需要外部查證的資訊。";
  if (slug === "nutritionist") return `你是安全優先的 AI 營養師。使用者資料：${health.gender === "male" ? "男性" : "女性"}、${health.age} 歲、${health.height}cm、${health.weight}kg、活動係數 ${health.activity}、目標 ${health.goal}、忌口 ${health.dietary}、估計 TDEE ${calculateTdee(health)} kcal。請以 Markdown 輸出一般健康提醒、建議熱量與宏量方向、7 天飲食計畫表與採買／執行提示。不可診斷或取代合格醫療與營養專業。${safety}`;
  if (slug === "fitness-coach") return `你是安全優先的 AI 體態與瘦身教練。使用者資料：${health.gender === "male" ? "男性" : "女性"}、${health.age} 歲、${health.height}cm、${health.weight}kg、活動係數 ${health.activity}、目標 ${health.goal}、限制 ${health.dietary}、估計 TDEE ${calculateTdee(health)} kcal。請以 Markdown 輸出安全提醒、每週運動強度原則、7 天運動安排表、恢復與飲食搭配。避免極端節食、過度訓練與醫療承諾。${safety}`;
  return "你是 Gemini API 連線檢測助理。";
}

export default function ToolDetail() {
  const [, params] = useRoute("/tools/:slug");
  const tool = getTool(params?.slug ?? "");
  const { apiKey, hasApiKey } = useApiKey();
  const [input, setInput] = useState(""); const [language, setLanguage] = useState("繁體中文 → 英文"); const [messages, setMessages] = useState<ChatMessage[]>([]); const [health, setHealth] = useState(defaultHealth); const [cards, setCards] = useState<TarotCard[]>([]); const [deckSize, setDeckSize] = useState<22 | 78>(22); const [cardCount, setCardCount] = useState(3); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [recording, setRecording] = useState(false);
  const Icon = tool ? iconBySlug[tool.slug] : Bot; const isQuota = tool?.slug === "gemini-quota"; const isHealth = tool?.slug === "nutritionist" || tool?.slug === "fitness-coach"; const isTarot = tool?.slug === "tarot-master";
  const storageKey = tool ? `gugopro_workspace_${tool.slug}` : "gugopro_workspace";
  const tdee = useMemo(() => calculateTdee(health), [health]);
  useEffect(() => { try { setMessages(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { setMessages([]); } }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-24))); }, [messages, storageKey]);
  if (!tool) return <SiteShell><main className="not-found-panel"><h1>找不到此 AI 工作區。</h1><Link href="/" className="signal-button">回到 GuGoPro</Link></main></SiteShell>;
  const signature = tool.slug === "language-tutor" ? ["MODE / MULTI-TURN TUTOR", `CHANNEL / ${language}`, "OUTPUT / CORRECTION + PRONUNCIATION"] : tool.slug === "live-translation" ? ["MODE / CONTEXTUAL TRANSLATION", `DIRECTION / ${language}`, "INPUT / TEXT + WEB SPEECH"] : tool.slug === "tarot-master" ? ["MODE / REFLECTION SPREAD", `DECK / ${deckSize} CARDS`, `DRAW / ${cards.length}/${cardCount} LOCAL`] : isHealth ? ["MODE / PERSONAL PLAN", `TDEE / ${tdee} KCAL`, `GOAL / ${health.goal}`] : tool.slug === "amazon-research" ? ["MODE / MARKET HYPOTHESIS", "DATA / USER-PROVIDED", "OUTPUT / RISKS + NEXT CHECKS"] : ["MODE / API INSPECTION", "PROVIDER / GOOGLE", "SCOPE / BROWSER-LOCAL LOG"];

  const openKeyGuide = () => window.dispatchEvent(new Event("gugopro:open-api-key"));
  const clearChat = () => { setMessages([]); setError(""); localStorage.removeItem(storageKey); };
  const exportChat = () => saveTextFile(`${tool.slug}-${new Date().toISOString().slice(0, 10)}.md`, `# ${tool.title}\n\n${messages.map((message) => `## ${message.role === "user" ? "我的輸入" : "Gemini 回覆"}\n\n${message.text}`).join("\n\n")}`);
  const drawCards = () => { const next = drawTarotCards(deckSize, cardCount); setCards(next); setError(""); };
  const startSpeech = () => {
    const Recognition = (window as unknown as { SpeechRecognition?: BrowserRecognitionConstructor; webkitSpeechRecognition?: BrowserRecognitionConstructor }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: BrowserRecognitionConstructor }).webkitSpeechRecognition;
    if (!Recognition) { setError("此瀏覽器不支援 Web Speech API。請改用文字輸入，或使用 Chrome／Edge。 "); return; }
    const recognition = new Recognition(); recognition.lang = language.startsWith("英文") ? "en-US" : language.includes("日文") ? "ja-JP" : language.includes("韓文") ? "ko-KR" : "zh-TW"; recognition.interimResults = true; recognition.continuous = false;
    recognition.onstart = () => setRecording(true); recognition.onend = () => setRecording(false); recognition.onerror = () => { setRecording(false); setError("語音辨識未完成，請確認麥克風權限後再試。 "); }; recognition.onresult = (event) => setInput(Array.from(event.results).map((result) => result[0]?.transcript ?? "").join("")); recognition.start();
  };
  const run = async () => {
    if (!hasApiKey) { setError("請先設定你的 Gemini API Key。金鑰只會留在此瀏覽器。 "); openKeyGuide(); return; }
    if (!isQuota && !input.trim()) { setError(isTarot ? "請先輸入你想提問的主題。" : "請先輸入內容或需求。 "); return; }
    if (isTarot && !cards.length) { setError("請先完成本機抽牌，再送出問題。 "); return; }
    setLoading(true); setError("");
    try {
      if (isQuota) {
        const count = await inspectGeminiKey(apiKey);
        setMessages((current) => [...current, { id: uid(), role: "model", text: `## Gemini API 連線成功\n\n你的瀏覽器已直接收到 Google API 的真實回應；可讀取 **${count}** 個模型資訊。\n\n> 剩餘配額、計費與專案級速率限制需以 Google AI Studio 或 Google Cloud 後台為準。`, createdAt: new Date().toISOString() }]);
      } else {
        const user: ChatMessage = { id: uid(), role: "user", text: input.trim(), createdAt: new Date().toISOString() };
        const history = messages.map(({ role, text }) => ({ role, text }));
        setMessages((current) => [...current, user]); setInput("");
        const text = await generateGeminiText({ apiKey, systemInstruction: systemFor(tool.slug, health, cards, language), history, userText: user.text, temperature: isTarot ? 0.75 : 0.55, maxOutputTokens: isHealth ? 4096 : 2400 });
        setMessages((current) => [...current, { id: uid(), role: "model", text, createdAt: new Date().toISOString() }]);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "請求未完成。請檢查 API Key、網路或 Google API 設定。 "); } finally { setLoading(false); }
  };

  return <SiteShell><main className="tool-page dark-glass-page">
    <div className="tool-hero-grid"><section><Link href="/" className="back-link"><ArrowLeft size={16} /> 返回 AI Hub</Link><div className="tool-number"><span>{tool.index}</span><i /></div><p className="eyebrow">{tool.category.toUpperCase()}</p><h1>{tool.title}</h1><p className="tool-lead">{tool.description}</p><div className="privacy-statement"><LockKeyhole size={17} /><span>你的 Key 與對話都留在目前瀏覽器；請求直連 Google Gemini，不經 GuGoPro 伺服器。</span></div><a className="legacy-link" href={tool.legacyUrl} target="_blank" rel="noreferrer">開啟既有 GuGoPro 工具頁 <ArrowUpRight size={14} /></a></section><div className="tool-orbit scope-instrument"><span className="scope-label top">CAL / {tool.index}</span><span className="scope-label right">LOCAL SIGNAL</span><span className="scope-cross x" /><span className="scope-cross y" /><div className="orbit-core"><Icon size={40} /></div><span className="orbit o1" /><span className="orbit o2" /><span className="orbit-node n1" /><span className="orbit-node n2" /><span className="orbit-node n3" /></div></div>
    <section className="workspace-section glass-workspace"><div className="workspace-heading"><div><p className="eyebrow">BROWSER-LOCAL GEMINI WORKSPACE</p><h2>{isQuota ? "Gemini 連線檢測" : "開始真實 AI 工作階段"}</h2></div><span className={`local-chip ${hasApiKey ? "ready" : ""}`}><i />{hasApiKey ? "KEY：本機已就緒" : "KEY：需要設定"}</span></div>
      <div className="workspace-rail"><span>01 本機輸入</span><i /><span>02 Gemini 直連</span><i /><span>03 Markdown 回覆</span><i /><span>04 本機匯出</span></div><div className={`tool-signature signature-${tool.slug}`}>{signature.map((item) => <span key={item}>{item}</span>)}</div>
      <div className="glass-tool-grid"><aside className="workspace-composer">
        {isHealth && <div className="health-profile"><div className="profile-title"><Flame size={16} /> 個人化 TDEE 參數 <strong>{tdee} kcal</strong></div><div className="health-fields"><label>性別<select value={health.gender} onChange={(event) => setHealth({ ...health, gender: event.target.value as HealthProfile["gender"] })}><option value="male">男性</option><option value="female">女性</option></select></label><label>年齡<input type="number" min="13" max="100" value={health.age} onChange={(event) => setHealth({ ...health, age: Number(event.target.value) })} /></label><label>身高 cm<input type="number" min="100" max="240" value={health.height} onChange={(event) => setHealth({ ...health, height: Number(event.target.value) })} /></label><label>體重 kg<input type="number" min="25" max="300" value={health.weight} onChange={(event) => setHealth({ ...health, weight: Number(event.target.value) })} /></label><label>活動量<select value={health.activity} onChange={(event) => setHealth({ ...health, activity: Number(event.target.value) })}><option value="1.2">久坐</option><option value="1.375">輕度</option><option value="1.55">中度</option><option value="1.725">高度</option></select></label><label>目標<select value={health.goal} onChange={(event) => setHealth({ ...health, goal: event.target.value })}><option>溫和減脂</option><option>維持體態</option><option>精實增肌</option></select></label></div><label className="field-label">忌口、傷害史或器材限制<input className="field-input" value={health.dietary} onChange={(event) => setHealth({ ...health, dietary: event.target.value })} placeholder="例如：乳糖不耐、膝部不適、只有彈力帶" /></label></div>}
        {isTarot && <div className="tarot-deck"><div className="profile-title"><Dices size={16} /> 本機抽牌 <strong>{cards.length ? "已抽牌" : "等待抽牌"}</strong></div><div className="tarot-options"><label>牌組<select value={deckSize} onChange={(event) => setDeckSize(Number(event.target.value) as 22 | 78)}><option value={22}>大阿卡納 22 張</option><option value={78}>完整塔羅 78 張</option></select></label><label>牌陣<select value={cardCount} onChange={(event) => setCardCount(Number(event.target.value))}><option value={1}>單張聚焦</option><option value={3}>三張：過去／現在／方向</option><option value={5}>五張：議題拆解</option></select></label></div><button className="glass-secondary wide" onClick={drawCards}><Dices size={16} /> 重新本機抽牌</button>{cards.length > 0 && <div className="drawn-cards">{cards.map((card, index) => <span key={`${card.name}-${index}`}><b>{index + 1}</b>{card.name}<em>{card.orientation}</em></span>)}</div>}</div>}
        {(tool.slug === "live-translation" || tool.slug === "language-tutor") && <label className="field-label">{tool.slug === "live-translation" ? "翻譯方向" : "練習語言"}<select className="field-input" value={language} onChange={(event) => setLanguage(event.target.value)}>{["繁體中文 → 英文", "英文 → 繁體中文", "繁體中文 → 日文", "日文 → 繁體中文", "繁體中文 → 韓文", "西班牙文 → 繁體中文"].map((item) => <option key={item}>{item}</option>)}</select></label>}
        {!isQuota && <label className="field-label" htmlFor="workspace-input">{isTarot ? "你的提問" : "你的需求或內容"}<textarea id="workspace-input" className="workspace-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder={tool.promptHint} rows={isHealth ? 5 : 8} /></label>}
        {tool.slug === "live-translation" && <button className={`speech-button ${recording ? "recording" : ""}`} onClick={startSpeech}>{recording ? <MicOff size={16} /> : <Mic size={16} />}{recording ? "正在聆聽，點擊以停止" : "使用麥克風輸入"}</button>}
        {error && <div className="workspace-error"><AlertTriangle size={16} /><span>{error}</span>{!hasApiKey && <button onClick={openKeyGuide}>設定 Key</button>}</div>}
        <button className="signal-button wide glass-send" disabled={loading} onClick={() => void run()}>{loading ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}{loading ? "Gemini 回覆中…" : isQuota ? "測試官方 Gemini 連線" : hasApiKey ? "送出至 Gemini 1.5 Flash" : "設定 Key 並開始"}</button>
        <p className="byok-note"><ShieldCheck size={15} /> 未設定 Key 時不會送出請求；設定後由瀏覽器直連 `generativelanguage.googleapis.com`。</p>
      </aside>
      <section className="glass-chat-panel"><div className="chat-panel-top"><span>GEMINI / LIVE RESPONSE</span><div><button onClick={clearChat} title="清除本機對話"><Trash2 size={15} /></button><button onClick={exportChat} disabled={!messages.length} title="匯出本機對話"><Download size={15} /></button></div></div><div className="chat-history">{messages.length ? messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}><div className="message-meta"><span>{message.role === "user" ? "YOU" : "GEMINI"}</span><time>{new Date(message.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</time>{message.role === "model" && <button onClick={() => void navigator.clipboard?.writeText(message.text)}><Copy size={13} /> 複製</button>}</div>{message.role === "model" ? <Streamdown>{message.text}</Streamdown> : <p>{message.text}</p>}</article>) : <div className="chat-empty"><CheckCircle2 size={27} /><h3>等待你的第一個真實請求</h3><p>{hasApiKey ? "輸入內容並送出，Gemini 的 Markdown 回覆將在此顯示。" : "先設定你自己的 Gemini API Key，接著即可由此瀏覽器直接呼叫 Google。"}</p></div>}</div></section></div>
    </section>
  </main></SiteShell>;
}
