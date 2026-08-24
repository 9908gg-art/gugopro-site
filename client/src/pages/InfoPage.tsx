/** Signal Atelier: policy content is designed as readable, specific documentation rather than decorative legal filler. */
import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import SiteShell from "@/components/SiteShell";

type InfoKind = "privacy" | "terms" | "about" | "contact";
type Page = { eyebrow: string; title: string; lead: string; sections: { title: string; body: string[] }[]; };
const content: Record<Exclude<InfoKind, "contact">, Page> = {
  privacy: { eyebrow: "TRUST DOCUMENT / 01", title: "隱私權政策", lead: "GuGoPro 的設計原則是讓 AI 工具保持有用，同時讓你的 API Key 與使用資料盡可能留在你的裝置上。", sections: [
    { title: "我們處理的資訊", body: ["GuGoPro 是一個前端網站。一般瀏覽時，網站不要求你建立帳號，也不要求輸入個人識別資訊。若你透過聯絡表單啟動電子郵件，電子郵件內容會由你選擇的郵件服務處理。"] },
    { title: "Cookie 與分析", body: ["網站可能使用必要的技術性 Cookie 與隱私友善流量分析，以了解頁面是否正常運作與內容使用情形。這些技術不應用於建立敏感個人檔案；你可在瀏覽器中管理 Cookie 與網站資料。"] },
    { title: "LocalStorage 與 API Key", body: ["你在設定面板輸入的 Gemini API Key 只會以 `gugopro_gemini_api_key` 存放於目前瀏覽器的 LocalStorage。GuGoPro 不會將此金鑰傳送到自有伺服器、資料庫或分析系統。你可隨時於設定面板清除它，或清除瀏覽器網站資料。", "工具的本機請求紀錄只保存於 `gugopro_request_log`，且僅保存時間、工具名稱、成功或失敗狀態及耗時；不保存金鑰、提示詞或模型回覆。"] },
    { title: "第三方 API 呼叫", body: ["當你主動使用需 Gemini API 的工具時，你的瀏覽器會直接將請求傳送給 Google Gemini API。該請求受 Google 自行適用的服務條款與隱私政策規範。你應確認自己有權使用所提供的金鑰，並避免提交不應分享的敏感資料。"] },
    { title: "政策更新與聯絡", body: ["我們可能因服務或法律需求更新本政策。重大更新會在此頁呈現。若對隱私有疑問，請寫信至 contact@gugopro.com。"] },
  ] },
  terms: { eyebrow: "TRUST DOCUMENT / 02", title: "服務條款", lead: "使用 GuGoPro 前，請先理解平台提供的是工具與資訊入口，而不是專業意見、結果保證或替代判斷。", sections: [
    { title: "服務範圍", body: ["GuGoPro 整合 AI 應用入口、模型規格比較、Token 成本試算與本機 API Key 操作介面。模型資訊與定價是協助比較的參考資料，會受供應商區域、版本、快取、批次、上下文長度、稅費與政策調整影響，實作前請以供應商最新公告為準。"] },
    { title: "AI 內容與使用者責任", body: ["AI 輸出可能不完整、不準確、過時或不適合你的情境。你應自行驗證輸出，並對依據輸出所做的任何決策、行動或發布內容負責。不得利用本平台或第三方 AI 服務從事違法、侵權、濫用、規避安全措施或傷害他人的行為。"] },
    { title: "健康、營養與運動免責聲明", body: ["AI 專屬營養師與 AI 減肥瘦身教練只提供一般健康、飲食與生活型態資訊，不能取代醫師、營養師、物理治療師或其他合格專業人員的診斷、治療或個人化處方。若有疾病、懷孕、疼痛、飲食疾患、用藥或特殊狀況，請先諮詢專業人士。"] },
    { title: "塔羅與生活建議免責聲明", body: ["AI 塔羅牌大師的內容僅供娛樂與自我反思，不構成心理醫療、法律、財務、投資、醫療或其他專業建議，也不保證預測或結果。重要決策應基於可靠資訊與合格專業意見。"] },
    { title: "第三方服務與責任限制", body: ["使用者自行提供並管理第三方 API Key。GuGoPro 不保證第三方 API、模型、資料來源或外部網站的持續可用性、輸出品質或定價正確性。在法律允許的最大範圍內，GuGoPro 對使用本網站或依賴 AI 輸出所產生的間接、偶發或衍生損失不負責任。"] },
  ] },
  about: { eyebrow: "ABOUT GUGOPRO", title: "在 AI 選擇爆炸之前，先建立一個可信任的入口。", lead: "GuGoPro 是給繁體中文使用者的 AI 聚合平台：將真正可用的日常工具，和可比較的大模型資訊，放在同一個具安全邊界的工作面上。", sections: [
    { title: "我們相信的事情", body: ["AI 平台不該只是一排聊天框。好工具要讓使用者知道自己正在使用什麼模型、付出多少成本、資料會往哪裡走，以及什麼時候應該轉向人類專業協助。"] },
    { title: "平台技術架構", body: ["GuGoPro 採瀏覽器優先的純前端架構。當工具需要 Gemini API 時，使用者自己的瀏覽器直接呼叫供應商 API；API Key 只存於本機 LocalStorage，不經由 GuGoPro 後端。模型探索器則優先讀取公開模型資料，再提供可被篩選、比較與試算的統一操作介面。"] },
    { title: "我們的使命", body: ["讓 AI 更容易被理解與採用，而不是讓使用者被資訊、費率與複雜設定淹沒。我們用清楚的介面、可見的安全說明與誠實的限制，協助每個人把 AI 變成實際可用的工作能力。"] },
  ] },
};

export default function InfoPage({ kind }: { kind: InfoKind }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [prepared, setPrepared] = useState(false); const page = kind === "contact" ? null : content[kind];
  const submitContact = (event: FormEvent) => { event.preventDefault(); const subject = encodeURIComponent(`GuGoPro 回饋：${name || "未署名"}`); const body = encodeURIComponent(`姓名：${name}\nEmail：${email}\n\n訊息：\n${message}`); setPrepared(true); window.location.href = `mailto:contact@gugopro.com?subject=${subject}&body=${body}`; };
  return <SiteShell><main className="info-page">{kind === "contact" ? <div className="contact-layout"><section className="contact-intro"><p className="eyebrow">CONTACT GUGOPRO</p><h1>讓每一則回饋，<em>推進更實用的 AI。</em></h1><p>歡迎回報錯誤、提出工具需求、分享資料來源或合作想法。我們會透過 <a href="mailto:contact@gugopro.com">contact@gugopro.com</a> 處理一般支援與回饋。</p><div className="contact-card"><Mail size={21} /><div><span>支援服務信箱</span><a href="mailto:contact@gugopro.com">contact@gugopro.com <ArrowUpRight size={14} /></a></div></div><div className="contact-note"><ShieldCheck size={18} /> 請勿在回饋中提供 API Key、密碼、完整身分證號或其他敏感資料。</div></section><form className="contact-form" onSubmit={submitContact}><p className="eyebrow">FEEDBACK FORM</p><h2>整理你的訊息</h2><label>姓名或稱呼<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="你希望我們怎麼稱呼你" /></label><label>回覆用 Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><label>訊息<textarea required value={message} onChange={(event) => setMessage(event.target.value)} rows={7} placeholder="請描述你的問題、建議或使用情境" /></label><button className="signal-button wide" type="submit">以 Email 開啟並傳送 <ArrowUpRight size={16} /></button>{prepared && <p className="prepared-note"><CheckCircle2 size={16} /> 已準備好郵件內容；請在你的郵件程式中確認後送出。</p>}</form></div> : page && <article className="policy-layout"><header><p className="eyebrow">{page.eyebrow}</p><h1>{page.title}</h1><p>{page.lead}</p><div className="policy-meta"><span>最後更新：2026 年 8 月 24 日</span><span>GuGoPro 官方資訊頁</span></div></header><div className="policy-content">{page.sections.map((section, index) => <section key={section.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{section.title}</h2>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}</div></article>}</main></SiteShell>;
}
