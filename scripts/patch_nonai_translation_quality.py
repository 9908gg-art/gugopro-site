from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/'i18n/nonai-visible-translations.json'
d=json.loads(p.read_text(encoding='utf-8'))
en=d['en']
en.update({
'每月固定投入 (元)':'Monthly fixed investment (yuan)',
'單筆投入（元）':'Amount per investment (yuan)',
'只有 |偏離百分點| 達門檻者列為調整':'Only entries reaching the |deviation in percentage points| threshold are adjusted.',
'直接聯動 m²、ha、km²、坪、甲、分、acre、ft²；每列保留工程常用基準，避免只切換單一 select 的繁瑣操作。':'Link m², ha, km², ping, jia, fen, acre, and ft² directly; each row keeps an engineering baseline so you do not have to switch a single select repeatedly.',
'萬用轉 PDF適合哪些工作？':'What kinds of tasks is the Universal PDF Converter suitable for?',
'萬用轉 PDF 神器：原理、計算方式與使用教學':'Universal PDF Converter: principles, calculations, and user guide',
'萬用 PDF 工具箱：運作機制與隱私解析':'Universal PDF Toolkit: operating mechanism and privacy',
'萬用 PDF 工具箱: how it works and privacy':'Universal PDF Toolkit: how it works and privacy',
'萬用 PDF 工具箱：仕組みとプライバシー':'Universal PDF Toolkit: mechanism and privacy',
'萬用入口依工作選擇不同瀏覽器 API 與 PDF.js/pdf-lib 模組：頁面操作使用 PDF 物件重組，影像輸出使用 Canvas，文字擷取使用文字層解析。工具不建立檔案上傳流程，但大型 PDF 仍受裝置記憶體與瀏覽器限制。 All processing stays in this browser tab unless an explicit external action is selected.':'The universal entry point selects browser APIs and PDF.js/pdf-lib modules by task: page operations rebuild PDF objects, image output uses Canvas, and text extraction parses the text layer. The tool does not upload files, although large PDFs remain limited by device memory and browser capacity. All processing stays in this browser tab unless an explicit external action is selected.',
'0050 元大台灣50':'0050 Yuanta Taiwan 50',
'0050 Yuanta Taiwan 50 (元大台灣50)':'0050 Yuanta Taiwan 50',
'每個自訂房間都有獨立的核心 Prompt；執行結果只會保留在目前房間並引用 [第 N 頁]。':'Each customized room has its own core prompt; execution results stay in the current room and cite [page N].',
'歡迎來到 GugoPro 商城！整合 Amazon 官方 18 大全品類 — 從 3C 電腦、電競設備、生活家電、棋牌博弈、投資書單到塔羅水晶與寵物用品，請選擇您要前往的亞馬遜地區門市，即可一鍵搜尋精選好物。':'Welcome to GugoPro Store! We bring together Amazon\'s 18 official categories—from computers and 3C devices, gaming equipment, home appliances, board games, investment books, Tarot crystals, and pet supplies. Choose your Amazon regional storefront to search curated products in one click.',
})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('patched',len(en))
