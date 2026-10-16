from pathlib import Path

root = Path(__file__).resolve().parents[1]
lesson_dir = root / 'articles' / 'investment'
links = {
    '01-': ('複利滾存試算器', '../../academy/tools/compound-interest.html', '把時間與投入假設帶入試算器，觀察複利曲線。'),
    '02-': ('資產配置與再平衡', '../../academy/tools/portfolio-rebalancer.html', '用目標權重檢查 ETF 組合的偏離程度。'),
    '03-': ('資產配置與再平衡', '../../academy/tools/portfolio-rebalancer.html', '把配置比例轉成可執行的再平衡金額。'),
    '04-': ('投資決策檢查表', '../../academy/lessons/16-investor-behavior.html', '用決策紀律補足券商與交易執行之外的風險。'),
    '05-': ('安全邊際估值器', '../../academy/tools/margin-of-safety.html', '以 EPS、本益比與安全邊際反推可接受價格。'),
    '06-': ('歷史 VaR 估算器', '../../academy/tools/var-calculator.html', '將波動與可能損失轉化為可觀察的風險門檻。'),
    '07-': ('退休現金流與提領', '../../academy/lessons/15-retirement-cashflow.html', '把提領率、通膨與序列風險放進同一個框架。'),
    '08-': ('投資決策檢查表', '../../academy/lessons/16-investor-behavior.html', '跨市場投資前，先確認目標、風險與執行規則。'),
    '09-': ('資產配置與再平衡', '../../academy/tools/portfolio-rebalancer.html', '檢查高股息部位是否造成組合權重偏離。'),
    '10-': ('資產配置與再平衡', '../../academy/tools/portfolio-rebalancer.html', '在股票與債券間建立符合目標的配置。'),
    '11-': ('投資決策檢查表', '../../academy/lessons/16-investor-behavior.html', '以事前假設與事後複盤提升研究品質。'),
    '12-': ('資產配置與再平衡', '../../academy/tools/portfolio-rebalancer.html', '把通膨避險資產放回整體風險預算中評估。'),
    '13-': ('歷史 VaR 估算器', '../../academy/tools/var-calculator.html', '避免把單一技術指標誤當成完整風控系統。'),
    '14-': ('投資決策檢查表', '../../academy/lessons/16-investor-behavior.html', '用樣本外思維與複盤紀錄降低過度擬合。'),
}
marker = '<!-- GugoPro Academy interactive lab -->'
for page in sorted(lesson_dir.glob('*.html')):
    match = next((v for k, v in links.items() if page.name.startswith(k)), None)
    if not match:
        continue
    text = page.read_text(encoding='utf-8')
    if marker in text:
        continue
    title, href, description = match
    banner = f'''<section style="max-width:860px;margin:32px auto;padding:20px 24px;border-radius:14px;background:linear-gradient(120deg,#101b33,#1c3c55);color:#fff;font-family:system-ui,sans-serif"><div style="font-size:11px;letter-spacing:.14em;color:#70d5c4;font-weight:800;text-transform:uppercase">GugoPro Academy · Interactive lab</div><h3 style="margin:8px 0;font-size:21px">{title}</h3><p style="margin:0 0 14px;color:#c8d6e8">{description}</p><a href="{href}" style="display:inline-block;background:#f1b84b;color:#142033;padding:9px 14px;border-radius:8px;font-weight:800;text-decoration:none">立即操作工具 →</a></section>{marker}'''
    if '</body>' not in text:
        raise RuntimeError(f'No body tag: {page}')
    page.write_text(text.replace('</body>', banner + '</body>'), encoding='utf-8')
    print(page.name, 'linked to', title)
