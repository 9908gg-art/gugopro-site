/**
 * GugoPro Unified AI Core Module (gugo-ai-core.js)
 * 適用於 GugoPro 旗下所有 AI 工具（語言導師、紫微斗數、塔羅占卜、減肥教練、專屬營養師、選品助手）
 *
 * 核心職責：
 *  1. 每日動態拉取 https://quota.gugopro.com/gemini_rate_limits.json 最新免費模型與評分
 *  2. 嚴格過濾對話專用模型（排除 embedding、tts、image_gen、robotics 等專用模型）
 *  3. API Key 本地安全隔離存取（100% localStorage，不經第三方伺服器）
 *  4. 確定性錯誤防禦矩陣：
 *     - 400 / 401 / 403 / 404：快速失敗（Fail-Fast），提示使用者檢查 Key 或參數，不盲目輪替
 *     - 429 / 500 / 503 / 504 / 逾時：自動階梯降級輪替（Cascading Failover）
 *     - 全模型繁忙：熔斷保護（Circuit Breaker），防止無窮迴圈
 *  5. 整合 GugoPro 全域免費用量（global-ai-quota.js）自動計數與太平洋時間（00:00 PT）重置倒數
 *  6. 統一提供文字生成（generateText）與 JSON 結構化解析（generateJSON）
 */

(function(window) {
    'use strict';

    if (window.GugoAICore) return; // 防止重複載入

    const CONFIG = {
        // 每日由本機推送的最新模型資料源
        QUOTA_MODELS_URL: 'https://quota.gugopro.com/gemini_rate_limits.json',
        API_KEY_STORAGE_KEYS: ['gugopro_gemini_api_key', 'gemini_api_key'],
        MODEL_PREFERENCE_KEY: 'gugopro_ai_model_preference_v1',
        MODEL_DISABLED_KEY: 'gugopro_ai_disabled_models_v1',
        MODEL_RPM_USAGE_KEY: 'gugopro_ai_rpm_usage_v1',
        REQUEST_TIMEOUT_MS: 15000, // 15秒超時保護
        DEFAULT_FALLBACK_MODELS: [
            { api_name: 'gemini-2.5-flash-lite', display_name: 'Gemini 2.5 Flash Lite', score: 9.2, dailyQuota: 20 },
            { api_name: 'gemini-2.5-flash', display_name: 'Gemini 2.5 Flash', score: 9.2, dailyQuota: 20 }
        ]
    };

    // 白名單能力與排除黑名單
    const MODEL_TEXT_CAPABILITIES = new Set(['text_generation', 'chat_dialog']);
    const MODEL_EXCLUDED_TOKENS = /embedding|aqa|tts|speech|audio|live|ocr|image[_-]?gen|robotics|computer[-_]?use|deep[-_]?research|veo|lyria/i;

    // 核心內部狀態
    const state = {
        availableModels: [],
        disabledModels: new Set(),
        modelBusyStates: new Map(), // 記錄 429 / 503 忙碌狀態
        currentModel: null,
        currentModelIndex: 0,
        modelCatalogPromise: null,
        quotaResetTimer: null
    };

    // --- 1. 金鑰本地安全存取 (API Key Vault) ---
    function decodeApiKey(raw) {
        if (!raw) return '';
        if (!raw.startsWith('obf_')) return raw;
        try {
            return decodeURIComponent(atob(raw.slice(4)));
        } catch (e) {
            return '';
        }
    }

    function getApiKey() {
        for (const key of CONFIG.API_KEY_STORAGE_KEYS) {
            const raw = (localStorage.getItem(key) || '').trim();
            const decoded = decodeApiKey(raw);
            if (decoded) return decoded;
        }
        return '';
    }

    function setApiKey(key) {
        const trimmed = String(key || '').trim();
        if (trimmed) {
            CONFIG.API_KEY_STORAGE_KEYS.forEach(k => localStorage.setItem(k, trimmed));
        } else {
            CONFIG.API_KEY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
        }
        window.dispatchEvent(new CustomEvent('gugopro:apikey-updated', { detail: { hasKey: !!trimmed } }));
    }

    function hasApiKey() {
        return !!getApiKey();
    }

    // --- 2. 模型設定與偏好開關 (Model Preferences) ---
    function loadDisabledModels() {
        try {
            const saved = JSON.parse(localStorage.getItem(CONFIG.MODEL_DISABLED_KEY) || '[]');
            state.disabledModels = new Set(Array.isArray(saved) ? saved.map(String).filter(Boolean) : []);
        } catch (e) {
            state.disabledModels = new Set();
        }
    }

    function persistDisabledModels() {
        localStorage.setItem(CONFIG.MODEL_DISABLED_KEY, JSON.stringify(Array.from(state.disabledModels)));
    }

    function isModelEnabled(apiName) {
        return Boolean(apiName) && !state.disabledModels.has(apiName);
    }

    function setModelEnabled(apiName, enabled) {
        if (!apiName) return;
        if (enabled) state.disabledModels.delete(apiName);
        else state.disabledModels.add(apiName);
        persistDisabledModels();
        reconcileCurrentModel();
        syncGlobalQuotaLimit();
        window.dispatchEvent(new CustomEvent('gugopro:models-updated'));
    }

    function getSavedModelPreference() {
        return String(localStorage.getItem(CONFIG.MODEL_PREFERENCE_KEY) || '').trim();
    }

    function setPreferredModel(apiName) {
        if (apiName && isModelEnabled(apiName)) {
            localStorage.setItem(CONFIG.MODEL_PREFERENCE_KEY, String(apiName));
            state.currentModel = apiName;
        } else {
            localStorage.removeItem(CONFIG.MODEL_PREFERENCE_KEY);
            reconcileCurrentModel();
        }
        window.dispatchEvent(new CustomEvent('gugopro:models-updated'));
    }

    function getEnabledModels() {
        return state.availableModels.filter(m => isModelEnabled(m.api_name));
    }

    function getModelQueue() {
        const enabled = [...getEnabledModels()];
        const preferred = getSavedModelPreference();
        const preferredIdx = enabled.findIndex(m => m.api_name === preferred);
        if (preferredIdx > 0) {
            const [pref] = enabled.splice(preferredIdx, 1);
            enabled.unshift(pref);
        }
        return enabled;
    }

    function reconcileCurrentModel() {
        const queue = getModelQueue();
        state.currentModel = queue[0]?.api_name || null;
        state.currentModelIndex = Math.max(0, queue.findIndex(m => m.api_name === state.currentModel));
        return state.currentModel;
    }

    // --- 3. 模型解析與過濾規則 (符合 quota.gugopro.com 與 AI 導師標準) ---
    function getModelDailyQuota(model) {
        const raw = model?.free_quota ?? model?.freeQuota ?? model?.rpd_limit ?? model?.daily_limit ?? model?.quota ?? 0;
        const quota = Number(String(raw).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)?.[0] || raw);
        return Number.isFinite(quota) ? quota : 0;
    }

    function isEligibleChatModel(model) {
        if (!model || model.is_free_tier !== true || model.requires_billing_account === true || model.is_rest_compatible === false) return false;
        if (getModelDailyQuota(model) <= 0) return false;

        const name = String(model.api_name || model.name || '').toLowerCase();
        const category = String(model.category || '').toLowerCase();
        const capabilities = Array.isArray(model.capabilities) ? model.capabilities.map(i => String(i).toLowerCase()) : [];
        const hasTextCapability = capabilities.some(c => MODEL_TEXT_CAPABILITIES.has(c));
        const isTextOut = category.includes('text-out') || category.includes('text out');

        if (!hasTextCapability || MODEL_EXCLUDED_TOKENS.test(name)) return false;
        if (!isTextOut && /embedding|aqa|tts|speech|audio|live|ocr|image|vision|map|grounding|search|robotics|computer|deep[-_ ]?research/i.test(category)) return false;
        return true;
    }

    function normaliseGeminiModel(m) {
        if (!m || typeof m !== 'object' || !isEligibleChatModel(m)) return null;
        const name = String(m.api_name || m.name || '').replace(/^models\//, '').trim();
        if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9.\-]+$/.test(name)) return null;
        return {
            api_name: name,
            display_name: String(m.display_name || name),
            score: Number.isFinite(Number(m.model_score)) ? Number(m.model_score) : 0,
            dailyQuota: getModelDailyQuota(m)
        };
    }

    async function fetchModels({ force = false } = {}) {
        if (state.modelCatalogPromise && !force) return state.modelCatalogPromise;
        loadDisabledModels();

        state.modelCatalogPromise = (async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
                const res = await fetch(CONFIG.QUOTA_MODELS_URL, { cache: 'no-store', signal: controller.signal });
                clearTimeout(timeoutId);

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const rawList = Array.isArray(data) ? data : (data.models || []);

                const parsed = rawList.map(normaliseGeminiModel).filter(Boolean);

                // 去重並按 model_score 高低排序
                const uniqueMap = new Map();
                parsed.forEach(m => {
                    const exist = uniqueMap.get(m.api_name);
                    if (!exist || m.score > exist.score) uniqueMap.set(m.api_name, m);
                });

                state.availableModels = Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score || a.display_name.localeCompare(b.display_name));

                reconcileCurrentModel();
                syncGlobalQuotaLimit();
                window.dispatchEvent(new CustomEvent('gugopro:models-updated'));
                return state.availableModels;

            } catch (err) {
                console.warn('[GugoAICore] 模型清單載入失敗，使用備援預設清單:', err);
                if (state.availableModels.length === 0) {
                    state.availableModels = [...CONFIG.DEFAULT_FALLBACK_MODELS];
                    reconcileCurrentModel();
                }
                return state.availableModels;
            } finally {
                state.modelCatalogPromise = null;
            }
        })();

        return state.modelCatalogPromise;
    }

    // --- 4. 全域配額整合與太平洋重置計算 ---
    function syncGlobalQuotaLimit() {
        const tracker = window.GugoProGlobalAIQuota;
        if (tracker && typeof tracker.setDailyLimit === 'function') {
            tracker.resetIfNewPacificDay();
            const total = getEnabledModels().reduce((acc, m) => acc + (Number(m.dailyQuota) || 0), 0);
            tracker.setDailyLimit(total, 'GugoAICore enabled models');
        }
    }

    function getPacificResetCountdown(now = new Date()) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZoneName: 'longOffset'
        });
        const parts = Object.fromEntries(formatter.formatToParts(now).map(p => [p.type, p.value]));
        const offsetMatch = String(parts.timeZoneName || '').match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
        const offsetMin = offsetMatch
            ? (offsetMatch[1] === '-' ? -1 : 1) * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3] || 0))
            : -480;
        const nextMidnight = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, 0, 0, 0) - offsetMin * 60 * 1000;
        return Math.max(0, nextMidnight - now.getTime());
    }

    // --- 5. 核心 API 請求與確定性錯誤防禦調度 ---
    async function executeGeminiRequest(payload, options = {}) {
        const apiKey = getApiKey();
        if (!apiKey) {
            const err = new Error('MISSING_API_KEY');
            err.code = 'MISSING_API_KEY';
            throw err;
        }

        if (state.availableModels.length === 0) {
            await fetchModels();
        }

        const queue = getModelQueue();
        if (queue.length === 0) {
            const err = new Error('NO_ENABLED_MODELS');
            err.code = 'NO_ENABLED_MODELS';
            throw err;
        }

        const attemptedModels = [];
        let lastError = null;

        for (let i = 0; i < queue.length; i++) {
            const model = queue[i];
            attemptedModels.push(model.api_name);
            state.currentModel = model.api_name;
            state.currentModelIndex = i;

            if (typeof options.onModelAttempt === 'function') {
                options.onModelAttempt(model.api_name, i, queue.length);
            }

            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.api_name)}:generateContent?key=${encodeURIComponent(apiKey)}`;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                // 200 成功
                if (response.ok) {
                    const data = await response.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) throw new Error('EMPTY_RESPONSE');

                    // 記錄呼叫次數到全域配額
                    if (window.GugoProGlobalAIQuota?.recordUsage) {
                        window.GugoProGlobalAIQuota.recordUsage(1, model.api_name);
                    }

                    // 成功時清除忙碌狀態
                    state.modelBusyStates.delete(model.api_name);
                    return {
                        text: text.trim(),
                        raw: data,
                        modelName: model.api_name
                    };
                }

                // 400, 401, 403, 404：客戶端致命錯誤，立即中止，絕對不盲目換模型
                if ([400, 401, 403, 404].includes(response.status)) {
                    const errorBody = await response.text();
                    const fatalError = new Error(`HTTP_${response.status}`);
                    fatalError.status = response.status;
                    fatalError.code = `HTTP_${response.status}`;
                    fatalError.details = errorBody;
                    fatalError.attemptedModels = attemptedModels;
                    throw fatalError;
                }

                // 429, 500, 503：配額上限或伺服器過載，執行自動階梯降級輪替
                if ([429, 500, 503].includes(response.status)) {
                    console.warn(`[GugoAICore] 模型 ${model.api_name} 回傳 HTTP ${response.status}，自動切換下一候選模型...`);
                    state.modelBusyStates.set(model.api_name, { status: response.status, time: Date.now() });
                    lastError = new Error(`HTTP_${response.status}`);
                    lastError.status = response.status;
                    continue;
                }

                // 其他未預期 HTTP 代碼
                lastError = new Error(`HTTP_${response.status}`);
                lastError.status = response.status;

            } catch (err) {
                // 15 秒超時
                if (err.name === 'AbortError') {
                    console.warn(`[GugoAICore] 模型 ${model.api_name} 連線逾時，切換下一候選模型...`);
                    state.modelBusyStates.set(model.api_name, { status: 'TIMEOUT', time: Date.now() });
                    lastError = new Error('TIMEOUT');
                    lastError.status = 504;
                    continue;
                }
                // 400 系列致命錯誤直接向上拋出
                if (err.status && [400, 401, 403, 404].includes(err.status)) {
                    throw err;
                }
                lastError = err;
            }
        }

        // 所有已啟用模型皆嘗試過且失敗（觸發熔斷）
        const exhaustedError = lastError || new Error('ALL_MODELS_EXHAUSTED');
        exhaustedError.code = 'ALL_MODELS_EXHAUSTED';
        exhaustedError.circuitBreaker = true;
        exhaustedError.attemptedModels = attemptedModels;
        throw exhaustedError;
    }

    // --- 6. 公開生成介面 (generateText & generateJSON) ---
    async function generateText(promptOrContents, options = {}) {
        let contents;
        if (typeof promptOrContents === 'string') {
            contents = [{ role: 'user', parts: [{ text: promptOrContents }] }];
        } else if (Array.isArray(promptOrContents)) {
            contents = promptOrContents;
        } else {
            throw new Error('INVALID_PROMPT_FORMAT');
        }

        const payload = {
            contents,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxOutputTokens ?? 4096
            }
        };

        if (options.systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: String(options.systemInstruction) }]
            };
        }

        return executeGeminiRequest(payload, options);
    }

    async function generateJSON(promptOrContents, options = {}) {
        let contents;
        if (typeof promptOrContents === 'string') {
            contents = [{ role: 'user', parts: [{ text: promptOrContents }] }];
        } else {
            contents = promptOrContents;
        }

        const payload = {
            contents,
            generationConfig: {
                temperature: options.temperature ?? 0.2,
                responseMimeType: 'application/json'
            }
        };

        if (options.responseSchema) {
            payload.generationConfig.responseSchema = options.responseSchema;
        }

        if (options.systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: String(options.systemInstruction) }]
            };
        }

        const result = await executeGeminiRequest(payload, options);
        // 清洗 Markdown 的 ```json ... ``` 標籤
        const clean = result.text.replace(/```json|```/g, '').trim();
        try {
            return {
                data: JSON.parse(clean),
                rawText: result.text,
                modelName: result.modelName
            };
        } catch (e) {
            throw new Error('JSON_PARSE_FAILED: ' + clean);
        }
    }

    // 暴露全域 API 物件
    window.GugoAICore = {
        // 金鑰管理
        getApiKey,
        setApiKey,
        hasApiKey,

        // 模型管理
        fetchModels,
        getAvailableModels: () => [...state.availableModels],
        getEnabledModels,
        getModelQueue,
        getCurrentModel: () => state.currentModel || reconcileCurrentModel(),
        setPreferredModel,
        setModelEnabled,
        isModelEnabled,

        // 配額與重置倒數
        getPacificResetCountdown,

        // 對話與運算調用
        generateText,
        generateJSON
    };

    // 自動於頁面加載完成時初始化模型清單
    document.addEventListener('DOMContentLoaded', () => {
        fetchModels({ force: false });
    });

})(window);