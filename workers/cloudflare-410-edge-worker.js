/**
 * Cloudflare Worker: HTTP 410 Gone 截斷與邊緣快取優化
 * 
 * 部署指引：
 * 1. 登入 Cloudflare Dashboard -> Workers & Pages -> Create Worker
 * 2. 貼上此腳本並部署
 * 3. 在 gugopro.com 域名設定 Triggers -> Routes:
 *    - gugopro.com/tools/converter-*
 *    - gugopro.com/converter-*
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. 匹配歷史舊版轉換工具路徑
    const isConverterPattern = 
      /^\/tools\/converter-.*\.html$/i.test(pathname) ||
      /^\/converter-(image|audio|video|chart|crypto|excel|finance|office|pdf|unit|color).*\.html$/i.test(pathname);

    if (isConverterPattern) {
      return new Response(
        `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, delete">
<title>410 Gone - 資源已永久移除 | GugoPro</title>
<style>
body{font-family:sans-serif;background:#0b1220;color:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px;text-align:center}
h1{color:#ff651e;font-size:32px;margin-bottom:12px}
p{color:#94a3b8;font-size:16px;max-width:540px;line-height:1.6}
a{color:#55dfd1;text-decoration:none;font-weight:bold}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<div>
<h1>410 Gone - 資源已永久註銷</h1>
<p>此舊版轉換工具已由站方永久下架移除，不再提供存取。請前往 <a href="/">GugoPro 首頁</a> 體驗全新旗艦工具。</p>
</div>
</body>
</html>`,
        {
          status: 410,
          statusText: "Gone",
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex, delete",
            "Cache-Control": "public, max-age=604800"
          }
        }
      );
    }

    // 2. 其他請求放行至 GitHub Pages 源站
    return fetch(request);
  }
};
