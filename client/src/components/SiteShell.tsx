/** Signal Atelier: the global shell is a calm dark instrument panel with clear security state. */
import { ReactNode, useEffect, useState } from "react";
import { Check, KeyRound, Menu, ShieldCheck, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useApiKey } from "@/contexts/ApiKeyContext";

const logoUrl = "/manus-storage/gugopro-signal-mark_fc4bb04d.png";

export default function SiteShell({ children }: { children: ReactNode }) {
  const { apiKey, clearApiKey, hasApiKey, setApiKey } = useApiKey();
  const [location] = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  useEffect(() => { if (panelOpen) setDraftKey(apiKey); }, [apiKey, panelOpen]);
  useEffect(() => {
    const openPanel = () => setPanelOpen(true);
    window.addEventListener("gugopro:open-api-key", openPanel);
    return () => window.removeEventListener("gugopro:open-api-key", openPanel);
  }, []);
  const saveKey = () => { setApiKey(draftKey); setPanelOpen(false); };

  return <div className="site-frame">
    <header className="site-header"><div className="nav-shell">
      <Link href="/" className="brand" aria-label="GuGoPro 首頁"><span className="brand-sigil"><img src={logoUrl} alt="GuGoPro 訊號標誌" className="brand-mark" /></span><span className="brand-word">Gu<span>Go</span><b>Pro</b></span></Link>
      <nav className={`nav-links ${menuOpen ? "is-open" : ""}`} aria-label="主要導覽">
        <a href="/#apps" onClick={() => setMenuOpen(false)}>AI 應用</a><a href="/#models" onClick={() => setMenuOpen(false)}>Model Explorer</a><a href="/#security" onClick={() => setMenuOpen(false)}>安全架構</a><Link href="/about" onClick={() => setMenuOpen(false)}>關於 GuGoPro</Link>
      </nav>
      <div className="nav-actions"><button className={`key-status ${hasApiKey ? "is-set" : ""}`} onClick={() => setPanelOpen(true)}>{hasApiKey ? <Check size={15} /> : <KeyRound size={15} />}<span>{hasApiKey ? "API Key 已在本機設定" : "設定 AI API Key"}</span></button><button className="menu-toggle" aria-label="切換導覽選單" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
    </div></header>
    {location !== "/" && <div className="instrument-strip" aria-label="GuGoPro 工作區狀態"><span className="tick" /><strong>GUGOPRO / INSTRUMENT MODE</strong><span className="separator" /><span>{hasApiKey ? "KEY: LOCAL / READY" : "KEY: NOT CONFIGURED"}</span><span className="separator" /><span>REQUEST PATH: BROWSER → PROVIDER</span><span className="source-status">SOURCE / 2026.08.24</span></div>}
    {children}
    <footer className="site-footer"><div className="footer-main">
      <div><Link href="/" className="brand footer-brand"><span className="brand-sigil"><img src={logoUrl} alt="" className="brand-mark" /></span><span className="brand-word">Gu<span>Go</span><b>Pro</b></span></Link><p>AI 應用與模型決策的可信任入口。<br />每一次連線，金鑰都留在你的瀏覽器。</p></div>
      <div className="footer-cluster"><span className="footer-label">平台</span><a href="/#apps">七大 AI 應用</a><a href="/#models">AI Model Explorer</a><button className="footer-text-button" onClick={() => setPanelOpen(true)}>設定 AI API Key</button></div>
      <div className="footer-cluster"><span className="footer-label">信任與支援</span><Link href="/privacy">隱私權政策</Link><Link href="/terms">服務條款</Link><Link href="/about">關於我們</Link><Link href="/contact">聯絡我們</Link></div>
      <div className="footer-source"><ShieldCheck size={18} /><span>模型規格會嘗試從 <a href="https://models.dev" target="_blank" rel="noreferrer">models.dev</a> 於你的瀏覽器更新；價格請以各供應商公告為準。</span></div>
    </div><div className="footer-base"><span>© 2026 GuGoPro. Crafted for practical AI decisions.</span><span>繁體中文 · 前端本機安全架構</span></div></footer>
    {panelOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setPanelOpen(false)}><section className="key-modal" role="dialog" aria-modal="true" aria-labelledby="key-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-heading"><div className="modal-icon"><KeyRound size={22} /></div><div><p className="eyebrow">PRIVATE BY DESIGN</p><h2 id="key-modal-title">設定 Gemini API Key</h2></div><button className="icon-button" aria-label="關閉設定視窗" onClick={() => setPanelOpen(false)}><X size={20} /></button></div>
      <p className="modal-copy">金鑰只會以 <code>gugopro_gemini_api_key</code> 儲存於此瀏覽器的 LocalStorage，並由你的瀏覽器直接向 Google API 發出請求。GuGoPro 不會接收、儲存或轉送此金鑰。</p>
      <label className="field-label" htmlFor="gemini-key">Gemini API Key</label><input id="gemini-key" className="field-input" type="password" autoComplete="off" value={draftKey} onChange={(event) => setDraftKey(event.target.value)} placeholder="貼上你的 Gemini API Key" />
      <div className="modal-actions">{hasApiKey ? <button className="text-danger" onClick={() => { clearApiKey(); setDraftKey(""); }}>清除本機金鑰</button> : <span />}<div className="button-pair"><button className="ghost-button" onClick={() => setPanelOpen(false)}>取消</button><button className="signal-button" onClick={saveKey}>儲存於此瀏覽器</button></div></div>
    </section></div>}
  </div>;
}
