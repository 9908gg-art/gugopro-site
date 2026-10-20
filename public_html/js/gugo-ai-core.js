/**
 * GugoPro Unified AI Core Module (gugo-ai-core.js)
 * 適用於 GugoPro 旗下全站 AI 工具
 *
 * 核心升級重點：
 *  1. 完整錯誤碼白話人話解釋（400, 401, 403, 404, 429, 500, 503, 504）。
 *  2. 遇到 404 或 503 時，不卡死、不依賴更換 Key，而是直接觸發「動態模型降級（Model Fallback）」轉移至備援模型。
 *  3. 安全單 Key 運作，避免同 IP 頻繁更換多組 Key 觸發 Google 風控封鎖。
 *  4. 全域配額精確扣減，杜絕 null 剩餘。
 */

(function(window) {
    'use strict';

    if (window.GugoAICore) return;

    const CONFIG = {
        QUOTA_MODELS_URL: 'https://quota.gugopro.com/gemini_rate_limits.json',
        API_KEY_STORAGE_KEYS: ['gugopro_gemini_api_key', 'gemini_api_key'],
        MODEL_PREFERENCE_KEY: 'gugopro_ai_tutor_model_preference_v1',
        MODEL_DISABLED_KEY: 'gugopro_ai_tutor_disabled_models_v1',
        DYNAMIC_MODELS_CACHE_KEY: 'gugopro_dynamic_models_catalog_cache_v2',
        REQUEST_TIMEOUT_MS: 16000
    };

    const MODEL_TEXT_CAPABILITIES = new Set(['text_generation', 'chat_dialog']);
    const MODEL_EXCLUDED_TOKENS = /embedding|aqa|tts|speech|audio|live|ocr|image[_-]?gen|robotics|computer[-_]?use|deep[-_]?research|veo|lyria/i;

    const state = {
        availableModels: [],
        disabledModels: new Set(),
        modelBusyStates: new Map(),
        currentModel: null,
        currentModelIndex: 0,
        modelCatalogPromise: null
    };

    // 白話文錯誤代碼字典
    const ERROR_EXPLANATIONS = {
        'MISSING_API_KEY': '🔑 尚未設定 Gemini API Key，請先輸入您的免費金鑰即可開始使用。',
        'NO_ENABLED_MODELS': '⚠️ 目前所有 AI 模型均處於停用狀態，請於側邊欄開啟至少一個模型。',
        'HTTP_400': '⚠️ 輸入內容或音訊格式不相符，請確認後重新發送。',
        'HTTP_401': '🔑 API Key 填寫有誤或已過期，請點擊設定重新貼上正確的 Gemini API Key。',
        'HTTP_403': '🛡️ 目前 API Key 權限不足或受專案限制，請確認 Google Cloud 專案權限。',
        'HTTP_404': '⚠️ 該模型節點正在維護，系統已為您自動切換至備援模型繼續對話...',
        'HTTP_429': '⚡ 目前模型免費用量暫時飽和，系統已自動為您切換至負載較低的備援模型。',
        'HTTP_500': '⏳ Google 官方伺服器暫時繁忙，系統正在自動切換備援節點...',
        'HTTP_503': '⏳ 該模型當前伺服器負載較高，系統已自動為您切換至順暢的備援模型。',
        'HTTP_504': '🌐 網路傳輸連線逾時，系統正在為您嘗試重新發送...',
        'ALL_MODELS_EXHAUSTED': '⚠️ 所有備援模型目前皆暫時處於高負載，請稍候 30 秒後再次嘗試發送。'
    };

    function getFriendlyErrorMessage(err) {
        if (!err) return '⚠️ 系統連線異常，請稍後重試。';
        const code = err.code || (err.status ? `HTTP_${err.status}` : null);
        if (code && ERROR_EXPLANATIONS[code]) {
            return ERROR_EXPLANATIONS[code];
        }
        if (err.message && ERROR_EXPLANATIONS[err.message]) {
            return ERROR_EXPLANATIONS[err.message];
        }
        return `⚠️ 連線異常（${err.message || '請確認網路與金鑰'}），請稍後再試。`;
    }

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
        state.currentModel = queue[0]?.api_name || state.availableModels[0]?.api_name || null;
        state.currentModelIndex = Math.max(0, queue.findIndex(m => m.api_name === state.currentModel));
        return state.currentModel;
    }

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

                const uniqueMap = new Map();
                parsed.forEach(m => {
                    const exist = uniqueMap.get(m.api_name);
                    if (!exist || m.score > exist.score) uniqueMap.set(m.api_name, m);
                });

                if (uniqueMap.size > 0) {
                    state.availableModels = Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score || a.display_name.localeCompare(b.display_name));
                    try {
                        localStorage.setItem(CONFIG.DYNAMIC_MODELS_CACHE_KEY, JSON.stringify(state.availableModels));
                    } catch (_) {}

                    reconcileCurrentModel();
                    syncGlobalQuotaLimit();
                    window.dispatchEvent(new CustomEvent('gugopro:models-updated'));
                }
                return state.availableModels;

            } catch (err) {
                console.warn('[GugoAICore] 模型動態拉取失敗，讀取本機快取:', err);
                if (state.availableModels.length === 0) {
                    try {
                        const cached = JSON.parse(localStorage.getItem(CONFIG.DYNAMIC_MODELS_CACHE_KEY) || '[]');
                        if (Array.isArray(cached) && cached.length > 0) {
                            state.availableModels = cached;
                            reconcileCurrentModel();
                            syncGlobalQuotaLimit();
                            window.dispatchEvent(new CustomEvent('gugopro:models-updated'));
                        }
                    } catch (_) {}
                }
                return state.availableModels;
            } finally {
                state.modelCatalogPromise = null;
            }
        })();

        return state.modelCatalogPromise;
    }

    function syncGlobalQuotaLimit() {
        const tracker = window.GugoProGlobalAIQuota;
        if (tracker && typeof tracker.setDailyLimit === 'function') {
            tracker.resetIfNewPacificDay();
            const total = getEnabledModels().reduce((acc, m) => acc + (Number(m.dailyQuota) || 0), 0);
            if (total > 0) {
                tracker.setDailyLimit(total, 'GugoAICore dynamically fetched models');
            }
        }
    }

    function getModelDisplayName(apiName) {
        if (!apiName) return '';
        const model = state.availableModels.find(m => m.api_name === apiName);
        return model ? model.display_name : apiName;
    }

    async function executeGeminiRequest(payload, options = {}) {
        const apiKey = getApiKey();
        if (!apiKey) {
            const err = new Error('MISSING_API_KEY');
            err.code = 'MISSING_API_KEY';
            err.friendlyMessage = ERROR_EXPLANATIONS['MISSING_API_KEY'];
            throw err;
        }

        if (state.availableModels.length === 0) {
            await fetchModels();
        }

        const queue = getModelQueue();
        if (queue.length === 0) {
            const err = new Error('NO_ENABLED_MODELS');
            err.code = 'NO_ENABLED_MODELS';
            err.friendlyMessage = ERROR_EXPLANATIONS['NO_ENABLED_MODELS'];
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

                if (response.ok) {
                    const data = await response.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) throw new Error('EMPTY_RESPONSE');

                    if (window.GugoProGlobalAIQuota?.recordUsage) {
                        window.GugoProGlobalAIQuota.recordUsage(1, model.api_name);
                    }
                    state.modelBusyStates.delete(model.api_name);

                    if (typeof options.onSuccess === 'function') {
                        options.onSuccess(model.api_name);
                    }

                    return {
                        text: text.trim(),
                        raw: data,
                        modelName: model.api_name
                    };
                }

                // 401, 403 屬於金鑰本身的致命問題，必須立即彈出輸入視窗，不無謂重試
                if ([401, 403].includes(response.status)) {
                    const errorBody = await response.text();
                    const fatalError = new Error(`HTTP_${response.status}`);
                    fatalError.status = response.status;
                    fatalError.code = `HTTP_${response.status}`;
                    fatalError.friendlyMessage = ERROR_EXPLANATIONS[`HTTP_${response.status}`];
                    fatalError.details = errorBody;
                    fatalError.attemptedModels = attemptedModels;
                    throw fatalError;
                }

                // 核心重點：遇到 404（模型失效/地區節點找不到）、429（配額暫時飽和）、500/503（伺服器負載）
                // 絕對不要卡死！立刻切換至隊列中的下一個模型進行無縫降級（Fallback）！
                if ([404, 429, 500, 503].includes(response.status)) {
                    const nextModel = queue[i + 1];
                    const failedName = getModelDisplayName(model.api_name);
                    const nextName = nextModel ? getModelDisplayName(nextModel.api_name) : '備用模型';
                    
                    let reasonText = '';
                    if (response.status === 404) reasonText = '模型節點維護中 (404)';
                    else if (response.status === 429) reasonText = '免費用量暫時飽和 (429)';
                    else reasonText = `伺服器負載忙碌 (${response.status})`;

                    console.warn(`[GugoAICore] ${failedName} ${reasonText}，正在為您無縫切換至 ${nextName}...`);

                    const fallbackDetail = {
                        failedModel: model.api_name,
                        failedDisplayName: failedName,
                        nextModel: nextModel?.api_name,
                        nextDisplayName: nextName,
                        status: response.status,
                        reason: reasonText,
                        friendlyMessage: response.status === 404 
                            ? `⚠️ 模型 ${failedName} 節點維護中，已自動為您切換至 ${nextName} 繼續對話...`
                            : `⚡ 模型 ${failedName} 負載較高，已為您無縫切換至 ${nextName} 繼續服務。`
                    };

                    if (typeof options.onModelFallback === 'function') {
                        options.onModelFallback(fallbackDetail);
                    }

                    window.dispatchEvent(new CustomEvent('gugopro:model-fallback', { detail: fallbackDetail }));

                    state.modelBusyStates.set(model.api_name, { status: response.status, time: Date.now() });
                    lastError = new Error(`HTTP_${response.status}`);
                    lastError.status = response.status;
                    lastError.code = `HTTP_${response.status}`;
                    lastError.friendlyMessage = ERROR_EXPLANATIONS[`HTTP_${response.status}`];
                    continue;
                }

                // 其他 400 錯誤
                const otherError = new Error(`HTTP_${response.status}`);
                otherError.status = response.status;
                otherError.code = `HTTP_${response.status}`;
                otherError.friendlyMessage = ERROR_EXPLANATIONS[`HTTP_${response.status}`] || `⚠️ 伺服器回應異常 (${response.status})`;
                throw otherError;

            } catch (err) {
                if (err.name === 'AbortError') {
                    const nextModel = queue[i + 1];
                    const failedName = getModelDisplayName(model.api_name);
                    const nextName = nextModel ? getModelDisplayName(nextModel.api_name) : '備用模型';

                    const timeoutDetail = {
                        failedModel: model.api_name,
                        failedDisplayName: failedName,
                        nextModel: nextModel?.api_name,
                        nextDisplayName: nextName,
                        status: 504,
                        reason: '連線反應逾時 (504)',
                        friendlyMessage: `🌐 連線反應逾時，正在為您切換至 ${nextName} 重試...`
                    };

                    if (typeof options.onModelFallback === 'function') {
                        options.onModelFallback(timeoutDetail);
                    }

                    window.dispatchEvent(new CustomEvent('gugopro:model-fallback', { detail: timeoutDetail }));

                    state.modelBusyStates.set(model.api_name, { status: 'TIMEOUT', time: Date.now() });
                    lastError = new Error('TIMEOUT');
                    lastError.status = 504;
                    lastError.code = 'HTTP_504';
                    lastError.friendlyMessage = ERROR_EXPLANATIONS['HTTP_504'];
                    continue;
                }
                if (err.status && [401, 403].includes(err.status)) {
                    throw err;
                }
                lastError = err;
            }
        }

        const exhaustedError = lastError || new Error('ALL_MODELS_EXHAUSTED');
        exhaustedError.code = 'ALL_MODELS_EXHAUSTED';
        exhaustedError.friendlyMessage = ERROR_EXPLANATIONS['ALL_MODELS_EXHAUSTED'];
        exhaustedError.circuitBreaker = true;
        exhaustedError.attemptedModels = attemptedModels;
        throw exhaustedError;
    }

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
                temperature: options.temperature ?? 0.75,
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

    async function transcribeAudio(audioBlob, options = {}) {
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const b64 = (reader.result || '').split(',')[1];
                if (b64) resolve(b64);
                else reject(new Error('EMPTY_AUDIO_BLOB'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });

        const targetLang = options.language || 'zh-TW';
        const instruction = targetLang === 'en-US'
            ? "Transcribe the spoken audio into text in English accurately."
            : (targetLang === 'ja-JP'
                ? "音声を日本語テキストに正確に書き起こしてください。"
                : "請將這段語音中的內容準確轉錄為繁體中文文字。");

        const payloadContents = [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: (audioBlob.type || 'audio/webm').split(';')[0],
                            data: base64Data
                        }
                    },
                    { text: `${instruction} 務必直接輸出轉錄出的文字即可，不要輸出任何多餘的解釋、標籤或問候語。` }
                ]
            }
        ];

        const result = await generateText(payloadContents, { temperature: 0.1 });
        return (result?.text || '').trim();
    }

    window.GugoAICore = {
        getApiKey,
        setApiKey,
        hasApiKey,
        fetchModels,
        getAvailableModels: () => [...state.availableModels],
        getEnabledModels,
        getModelQueue,
        getCurrentModel: () => state.currentModel || reconcileCurrentModel(),
        getModelDisplayName,
        setPreferredModel,
        setModelEnabled,
        isModelEnabled,
        generateText,
        generateJSON,
        transcribeAudio,
        getFriendlyErrorMessage
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadDisabledModels();
        try {
            const cached = JSON.parse(localStorage.getItem(CONFIG.DYNAMIC_MODELS_CACHE_KEY) || '[]');
            if (Array.isArray(cached) && cached.length > 0) {
                state.availableModels = cached;
                reconcileCurrentModel();
                syncGlobalQuotaLimit();
            }
        } catch (_) {}
        fetchModels({ force: false });
    });

})(window);