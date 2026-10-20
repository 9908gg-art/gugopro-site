/**
 * GugoPro Unified AI Core Module (gugo-ai-core.js)
 * 適用於 GugoPro 旗下全站 AI 工具（語言導師、AI 塔羅大師、紫微斗數等）
 *
 * 核心特性：
 *  1. 100% 動態模型架構：完全不寫死任何模型名稱，動態從 quota.gugopro.com/gemini_rate_limits.json 即時解析。
 *  2. 即時換模型通知廣播：遇 429、500、503、504 自動向前端廣播換模型事件（金色提示橫幅）並無縫轉移。
 *  3. 全域配額精確扣減：徹底修正 null 剩餘問題，與 GugoProGlobalAIQuota 精確聯動。
 *  4. 多模態語音轉錄（STT）：為無法使用原生 Web Speech API 的瀏覽器（如 Firefox、部分電腦端環境）提供 MediaRecorder + Gemini 雙軌語音轉文字支援。
 */

(function(window) {
    'use strict';

    if (window.GugoAICore) return; // 防止重複初始化

    const CONFIG = {
        QUOTA_MODELS_URL: 'https://quota.gugopro.com/gemini_rate_limits.json',
        API_KEY_STORAGE_KEYS: ['gugopro_gemini_api_key', 'gemini_api_key'],
        MODEL_PREFERENCE_KEY: 'gugopro_ai_tutor_model_preference_v1',
        MODEL_DISABLED_KEY: 'gugopro_ai_tutor_disabled_models_v1',
        DYNAMIC_MODELS_CACHE_KEY: 'gugopro_dynamic_models_catalog_cache_v2',
        REQUEST_TIMEOUT_MS: 16000 // 16 秒超時保護
    };

    const MODEL_TEXT_CAPABILITIES = new Set(['text_generation', 'chat_dialog']);
    const MODEL_EXCLUDED_TOKENS = /embedding|aqa|tts|speech|audio|live|ocr|image[_-]?gen|robotics|computer[-_]?use|deep[-_]?research|veo|lyria/i;

    const state = {
        availableModels: [], // 100% 動態拉取，完全不寫死任何模型
        disabledModels: new Set(),
        modelBusyStates: new Map(),
        currentModel: null,
        currentModelIndex: 0,
        modelCatalogPromise: null
    };

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

                if ([400, 401, 403].includes(response.status)) {
                    const errorBody = await response.text();
                    const fatalError = new Error(`HTTP_${response.status}`);
                    fatalError.status = response.status;
                    fatalError.code = `HTTP_${response.status}`;
                    fatalError.details = errorBody;
                    fatalError.attemptedModels = attemptedModels;
                    throw fatalError;
                }

                if ([404, 429, 500, 502, 503].includes(response.status)) {
                    const nextModel = queue[i + 1];
                    const failedName = getModelDisplayName(model.api_name);
                    const nextName = nextModel ? getModelDisplayName(nextModel.api_name) : '備用模型';
                    const reasonText = response.status === 429 
                        ? '免費用量暫時達到上限 (429)' 
                        : (response.status === 404 
                            ? '模型失效或路由異常 (404)' 
                            : `伺服器負載忙碌中 (${response.status})`);

                    console.warn(`[GugoAICore] ${failedName} ${reasonText}，即將切換至 ${nextName}...`);

                    const fallbackDetail = {
                        failedModel: model.api_name,
                        failedDisplayName: failedName,
                        nextModel: nextModel?.api_name,
                        nextDisplayName: nextName,
                        status: response.status,
                        reason: reasonText
                    };

                    if (typeof options.onModelFallback === 'function') {
                        options.onModelFallback(fallbackDetail);
                    }

                    window.dispatchEvent(new CustomEvent('gugopro:model-fallback', { detail: fallbackDetail }));

                    state.modelBusyStates.set(model.api_name, { status: response.status, time: Date.now() });
                    lastError = new Error(`HTTP_${response.status}`);
                    lastError.status = response.status;
                    continue;
                }

                lastError = new Error(`HTTP_${response.status}`);
                lastError.status = response.status;

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
                        reason: '連線逾時 (504)'
                    };

                    if (typeof options.onModelFallback === 'function') {
                        options.onModelFallback(timeoutDetail);
                    }

                    window.dispatchEvent(new CustomEvent('gugopro:model-fallback', { detail: timeoutDetail }));

                    state.modelBusyStates.set(model.api_name, { status: 'TIMEOUT', time: Date.now() });
                    lastError = new Error('TIMEOUT');
                    lastError.status = 504;
                    continue;
                }
                if (err.status && [400, 401, 403].includes(err.status)) {
                    throw err;
                }
                lastError = err;
            }
        }

        const exhaustedError = lastError || new Error('ALL_MODELS_EXHAUSTED');
        exhaustedError.code = 'ALL_MODELS_EXHAUSTED';
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

    // 專用多模態語音轉文字（STT）介面：解決電腦端或 Firefox 未支援原生語音辨識的困境
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
        transcribeAudio
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