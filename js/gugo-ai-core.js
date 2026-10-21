/**
 * GugoPro Unified AI Core Module (gugo-ai-core.js)
 * 適用於 GugoPro 旗下全站 AI 工具
 *
 * 核心功能重點：
 *  1. 完整保留舊版已輸入金鑰：啟動時自動遷移舊版 single key，絕不丟失使用者既有金鑰。
 *  2. 完整支援多組 API Key 儲存、新增、刪除、使用中切換與輪詢。
 *  3. API 請求遇到 429 配額耗盡或 401 異常時，自動切換至其他已儲存金鑰。
 *  4. 白話文錯誤代碼解釋，遇到 404/503 自動階梯降級可用模型。
 *  5. 支援多模態語音轉錄（STT），提供跨瀏覽器相容兜底。
 */

(function(window) {
    'use strict';

    if (window.GugoAICore) return;

    const CONFIG = {
        QUOTA_MODELS_URL: 'https://quota.gugopro.com/gemini_rate_limits.json',
        API_KEYS_STORAGE_KEY: 'gugopro_gemini_api_keys_v2',
        ACTIVE_KEY_INDEX_STORAGE_KEY: 'gugopro_gemini_active_key_index_v2',
        LEGACY_STORAGE_KEYS: ['gugopro_gemini_api_key', 'gemini_api_key'],
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
        modelCatalogPromise: null,
        apiKeys: [],
        activeKeyIndex: 0
    };

    // 白話文錯誤代碼字典
    const ERROR_EXPLANATIONS = {
        'MISSING_API_KEY': '🔑 尚未設定 Gemini API Key，請先輸入您的免費金鑰即可開始使用。',
        'NO_ENABLED_MODELS': '⚠️ 目前所有 AI 模型均處於停用狀態，請於側邊欄開啟至少一個模型。',
        'HTTP_400': '⚠️ 輸入內容或音訊格式不相符，請確認後重新發送。',
        'HTTP_401': '🔑 目前使用的 API Key 填寫有誤或已失效，請點擊設定檢查或切換有效金鑰。',
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

    // --- 多組 API KEY 管理引擎（嚴格保護舊 Key 不丟失） ---
    function loadApiKeys() {
        let loaded = [];
        try {
            const rawStored = localStorage.getItem(CONFIG.API_KEYS_STORAGE_KEY);
            if (rawStored) {
                const parsed = JSON.parse(rawStored);
                if (Array.isArray(parsed)) {
                    loaded = parsed.map(String).map(s => s.trim()).filter(Boolean);
                }
            }
        } catch (_) {
            loaded = [];
        }

        // 核心保護：檢測舊版 single-key 儲存，若存在且不在新列表內，自動追加保留，絕不讓舊 Key 消失！
        let hasMigrated = false;
        for (const legacyKey of CONFIG.LEGACY_STORAGE_KEYS) {
            const oldVal = (localStorage.getItem(legacyKey) || '').trim();
            const decoded = decodeApiKey(oldVal);
            if (decoded && !loaded.includes(decoded)) {
                loaded.push(decoded);
                hasMigrated = true;
            }
        }

        state.apiKeys = loaded;

        const savedIndex = parseInt(localStorage.getItem(CONFIG.ACTIVE_KEY_INDEX_STORAGE_KEY) || '0', 10);
        state.activeKeyIndex = (Number.isFinite(savedIndex) && savedIndex >= 0 && savedIndex < state.apiKeys.length) ? savedIndex : 0;

        if (hasMigrated || !localStorage.getItem(CONFIG.API_KEYS_STORAGE_KEY)) {
            persistApiKeys();
        }
    }

    function persistApiKeys() {
        localStorage.setItem(CONFIG.API_KEYS_STORAGE_KEY, JSON.stringify(state.apiKeys));
        localStorage.setItem(CONFIG.ACTIVE_KEY_INDEX_STORAGE_KEY, String(state.activeKeyIndex));

        // 同步保留給舊版插件或舊外掛讀取
        const currentActiveKey = state.apiKeys[state.activeKeyIndex] || state.apiKeys[0] || '';
        if (currentActiveKey) {
            CONFIG.LEGACY_STORAGE_KEYS.forEach(k => localStorage.setItem(k, currentActiveKey));
        } else {
            CONFIG.LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
        }

        window.dispatchEvent(new CustomEvent('gugopro:apikey-updated', {
            detail: {
                count: state.apiKeys.length,
                hasKey: state.apiKeys.length > 0
            }
        }));
    }

    function getApiKeys() {
        if (state.apiKeys.length === 0) loadApiKeys();
        return [...state.apiKeys];
    }

    function getApiKey() {
        if (state.apiKeys.length === 0) loadApiKeys();
        if (state.apiKeys.length === 0) return '';
        if (state.activeKeyIndex < 0 || state.activeKeyIndex >= state.apiKeys.length) {
            state.activeKeyIndex = 0;
        }
        return state.apiKeys[state.activeKeyIndex] || state.apiKeys[0] || '';
    }

    function setApiKey(newSingleKey) {
        // 向下相容單一金鑰呼叫
        const clean = String(newSingleKey || '').trim();
        if (!clean) return;
        addApiKey(clean);
    }

    function hasApiKey() {
        return getApiKeys().length > 0;
    }

    function addApiKey(rawKey) {
        const clean = String(rawKey || '').trim();
        if (!clean) return { success: false, message: '金鑰內容不能為空' };
        if (clean.length < 20) return { success: false, message: 'Gemini API Key 格式長度不足' };

        loadApiKeys();
        if (state.apiKeys.includes(clean)) {
            return { success: false, message: '該金鑰已存在列表中' };
        }

        state.apiKeys.push(clean);
        // 若為第一組新增，直接設為啟用中
        if (state.apiKeys.length === 1) {
            state.activeKeyIndex = 0;
        }
        persistApiKeys();
        return { success: true, message: '金鑰新增成功', count: state.apiKeys.length };
    }

    function removeApiKey(keyOrIndex) {
        loadApiKeys();
        let targetIndex = -1;
        if (typeof keyOrIndex === 'number') {
            targetIndex = keyOrIndex;
        } else if (typeof keyOrIndex === 'string') {
            targetIndex = state.apiKeys.indexOf(keyOrIndex.trim());
        }

        if (targetIndex < 0 || targetIndex >= state.apiKeys.length) {
            return { success: false, message: '找不到欲刪除的金鑰' };
        }

        state.apiKeys.splice(targetIndex, 1);
        if (state.activeKeyIndex >= state.apiKeys.length) {
            state.activeKeyIndex = Math.max(0, state.apiKeys.length - 1);
        }
        persistApiKeys();
        return { success: true, message: '金鑰已成功移除', count: state.apiKeys.length };
    }

    function setActiveKeyIndex(index) {
        loadApiKeys();
        if (index >= 0 && index < state.apiKeys.length) {
            state.activeKeyIndex = index;
            persistApiKeys();
            return true;
        }
        return false;
    }

    function maskApiKey(key) {
        if (!key || key.length < 12) return '******';
        return `${key.slice(0, 6)}...${key.slice(-4)}`;
    }

    // --- 模型管理與配額計算 ---
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

    // --- 核心請求排程執行器（多 Key 備援與動態模型降級） ---
    async function executeGeminiRequest(payload, options = {}) {
        loadApiKeys();
        const allKeys = getApiKeys();
        if (allKeys.length === 0) {
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

        // 將當前選中的使用中 Key 放在最前，其餘依序作為備援 Key
        const keyQueue = [
            allKeys[state.activeKeyIndex] || allKeys[0],
            ...allKeys.filter((_, idx) => idx !== state.activeKeyIndex)
        ];

        for (let kIdx = 0; kIdx < keyQueue.length; kIdx++) {
            const currentApiKey = keyQueue[kIdx];

            for (let i = 0; i < queue.length; i++) {
                const model = queue[i];
                attemptedModels.push(`${model.api_name}[Key-${kIdx + 1}]`);
                state.currentModel = model.api_name;
                state.currentModelIndex = i;

                if (typeof options.onModelAttempt === 'function') {
                    options.onModelAttempt(model.api_name, i, queue.length);
                }

                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.api_name)}:generateContent?key=${encodeURIComponent(currentApiKey)}`;

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

                    // 401 屬於該組 Key 無效，若有多組 Key，切換至下一組 Key 重試！
                    if ([401, 403].includes(response.status)) {
                        console.warn(`[GugoAICore] Key (${maskApiKey(currentApiKey)}) 回應 ${response.status} 權限無效，嘗試備援 Key...`);
                        lastError = new Error(`HTTP_${response.status}`);
                        lastError.status = response.status;
                        lastError.code = `HTTP_${response.status}`;
                        lastError.friendlyMessage = ERROR_EXPLANATIONS[`HTTP_${response.status}`];
                        break; // 跳出當前 Key 的模型循環，進入下一組備援 Key
                    }

                    // 遇到 404、429、500、503：自動切換至隊列中的下一個模型進行無縫降級
                    if ([404, 429, 500, 503].includes(response.status)) {
                        const nextModel = queue[i + 1];
                        const failedName = getModelDisplayName(model.api_name);
                        const nextName = nextModel ? getModelDisplayName(nextModel.api_name) : '備用模型';

                        let reasonText = '';
                        if (response.status === 404) reasonText = '模型節點維護中 (404)';
                        else if (response.status === 429) reasonText = '免費用量暫時飽和 (429)';
                        else reasonText = `伺服器負載忙碌 (${response.status})`;

                        console.warn(`[GugoAICore] ${failedName} ${reasonText}，正在為您切換至 ${nextName}...`);

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
                    lastError = err;
                }
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

    const UI_I18N = {
        'zh-TW': {
            apiTitle: '管理您的 Gemini API Key',
            apiCopy: '本工具使用 Google Gemini 官方模型。支援新增多組 API Key 備援，遇配額上限自動無縫切換。',
            apiNoticeFree: '建議使用未綁定信用卡、免計費的 Google 帳號。目前免費配額每組 Key 每日可達 1,000 次以上，完全滿足日常學習。',
            apiNoticeLocal: '金鑰 100% 儲存於目前設備瀏覽器本機儲存空間（localStorage），GugoPro 伺服器絕不蒐集或保存您的金鑰。',
            apiTutorialLink: '👉 還沒有 API Key？點此觀看 1 分鐘免費申請教學',
            apiListTitle: '已儲存金鑰列表（點擊切換使用中）：',
            apiCountUnit: '組金鑰',
            apiEmptyList: '尚未儲存任何金鑰。<br>請在下方貼上 Gemini API Key 並點擊「新增」。',
            apiActiveBadge: '使用中',
            apiDeleteKeyTitle: '刪除此組金鑰',
            apiPlaceholder: '貼上新的 API Key (AIzaSy...)',
            apiAddBtn: '新增',
            apiDoneBtn: '完成並開始',
            apiAddSuccess: '金鑰新增成功 ✓',
            apiSwitchSuccess: '已切換使用第 {index} 組金鑰 ✓',
            confirmDeleteTitle: '確認刪除金鑰',
            confirmDeleteMsg: '確定要刪除金鑰 {key} 嗎？此操作無法復原。',
            confirmTitle: '確認操作',
            cancelBtn: '取消',
            executeBtn: '確定執行'
        },
        'zh-CN': {
            apiTitle: '管理您的 Gemini API Key',
            apiCopy: '本工具使用 Google Gemini 官方模型。支持添加多组 API Key 备援，遇配额上限自动无缝切换。',
            apiNoticeFree: '建议使用未绑定信用卡、免计费的 Google 账号。目前免费配额每组 Key 每日可达 1,000 次以上，完全满足日常学习。',
            apiNoticeLocal: '密钥 100% 存储于当前设备浏览器本地存储空间（localStorage），GugoPro 服务器绝不收集或保存您的密钥。',
            apiTutorialLink: '👉 还没有 API Key？点此观看 1 分钟免费申请教程',
            apiListTitle: '已保存密钥列表（点击切换使用中）：',
            apiCountUnit: '组密钥',
            apiEmptyList: '尚未保存任何密钥。<br>请在下方粘贴 Gemini API Key 并点击“添加”。',
            apiActiveBadge: '使用中',
            apiDeleteKeyTitle: '删除此组密钥',
            apiPlaceholder: '粘贴新的 API Key (AIzaSy...)',
            apiAddBtn: '添加',
            apiDoneBtn: '完成并开始',
            apiAddSuccess: '密钥添加成功 ✓',
            apiSwitchSuccess: '已切换使用第 {index} 组密钥 ✓',
            confirmDeleteTitle: '确认删除密钥',
            confirmDeleteMsg: '确定要删除密钥 {key} 吗？此操作无法撤销。',
            confirmTitle: '确认操作',
            cancelBtn: '取消',
            executeBtn: '确定执行'
        },
        'en-US': {
            apiTitle: 'Manage Gemini API Keys',
            apiCopy: 'Powered by official Google Gemini models. Supports multiple backup API keys with automatic failover.',
            apiNoticeFree: 'We recommend using a billing-free Google account. Generous official free quotas easily cover daily learning.',
            apiNoticeLocal: 'API keys are stored 100% locally in your browser (localStorage). GugoPro servers never collect or upload your keys.',
            apiTutorialLink: '👉 Don\'t have an API Key? Click here for the 1-minute free tutorial',
            apiListTitle: 'Saved API Keys (Click to activate):',
            apiCountUnit: 'keys',
            apiEmptyList: 'No API keys saved yet.<br>Paste your Gemini API Key below and click "Add".',
            apiActiveBadge: 'Active',
            apiDeleteKeyTitle: 'Delete key',
            apiPlaceholder: 'Paste new API Key (AIzaSy...)',
            apiAddBtn: 'Add',
            apiDoneBtn: 'Done & Start',
            apiAddSuccess: 'API Key added successfully ✓',
            apiSwitchSuccess: 'Switched to Key #{index} ✓',
            confirmDeleteTitle: 'Confirm Key Deletion',
            confirmDeleteMsg: 'Are you sure you want to delete key {key}? This cannot be undone.',
            confirmTitle: 'Confirm Action',
            cancelBtn: 'Cancel',
            executeBtn: 'Confirm'
        },
        'ja-JP': {
            apiTitle: 'Gemini API Key の管理',
            apiCopy: 'Google Gemini 公式モデルを使用。複数のバックアップキーを登録でき、上限時は自動で切り替わります。',
            apiNoticeFree: '課金設定のない無料のGoogleアカウント推奨。1日1,000回以上の無料枠で十分学習可能です。',
            apiNoticeLocal: 'API Keyはブラウザ内（localStorage）に100%安全に保存され、サーバーへ送信・収集されることはありません。',
            apiTutorialLink: '👉 API Keyをお持ちでない方はこちら（1分無料取得ガイド）',
            apiListTitle: '保存済み API Key 一覧（クリックで使用切替）：',
            apiCountUnit: '件',
            apiEmptyList: 'まだ API Key が登録されていません。<br>下記に入力して「追加」をクリックしてください。',
            apiActiveBadge: '使用中',
            apiDeleteKeyTitle: 'このキーを削除',
            apiPlaceholder: '新しい API Key を貼り付け (AIzaSy...)',
            apiAddBtn: '追加',
            apiDoneBtn: '完了して開始',
            apiAddSuccess: 'API Key が正常に追加されました ✓',
            apiSwitchSuccess: '{index} 番目のキーに切り替えました ✓',
            confirmDeleteTitle: '削除の確認',
            confirmDeleteMsg: 'API Key {key} を削除してもよろしいですか？この操作は取り消せません。',
            confirmTitle: '確認',
            cancelBtn: 'キャンセル',
            executeBtn: '削除する'
        }
    };

    function ensureUIStyles() {
        if (document.getElementById('gugo-ai-core-styles')) return;
        const style = document.createElement('style');
        style.id = 'gugo-ai-core-styles';
        style.textContent = `
            .gugo-core-overlay {
                position: fixed; inset: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
                display: none; justify-content: center; align-items: center;
                z-index: 9999; padding: 16px; box-sizing: border-box;
            }
            .gugo-core-modal {
                background: #15161c; border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 20px; padding: 24px; max-width: 480px; width: 100%;
                max-height: 90vh; overflow-y: auto; box-sizing: border-box;
                color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
            }
            .gugo-core-header {
                display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
            }
            .gugo-core-title {
                color: #00f2ff; margin: 0; font-size: 1.15rem; font-weight: 700;
            }
            .gugo-core-close {
                background: none; border: none; color: #a0a0a0; font-size: 1.35rem; cursor: pointer; padding: 4px;
            }
            .gugo-core-close:hover { color: #fff; }
            .gugo-core-p {
                color: #a0a0a0; margin: 0 0 12px; line-height: 1.55; font-size: 0.86rem;
            }
            .gugo-core-notice {
                color: #dbeafe; background: rgba(14, 116, 144, 0.16);
                border: 1px solid rgba(34, 211, 238, 0.28); border-radius: 8px;
                padding: 8px 10px; margin: 0 0 10px; line-height: 1.45; font-size: 0.78rem;
            }
            .gugo-core-tutorial-link {
                background: rgba(255, 255, 255, 0.08); color: #fff; text-decoration: none;
                margin: 0 0 14px; display: block; padding: 10px; border-radius: 8px;
                text-align: center; font-weight: 700; font-size: 0.84rem; transition: background 0.2s;
            }
            .gugo-core-tutorial-link:hover { background: rgba(255, 255, 255, 0.14); }
            .gugo-core-keys-box {
                margin: 0 0 14px; padding: 12px; background: rgba(0, 0, 0, 0.35);
                border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px;
            }
            .gugo-core-keys-list {
                display: flex; flex-direction: column; gap: 8px; max-height: 160px;
                overflow-y: auto; margin: 8px 0; padding-right: 2px;
            }
            .gugo-core-key-item {
                display: flex; align-items: center; justify-content: space-between;
                padding: 8px 10px; background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px;
                cursor: pointer; transition: all 0.2s;
            }
            .gugo-core-key-item:hover { background: rgba(0, 242, 255, 0.08); border-color: rgba(0, 242, 255, 0.3); }
            .gugo-core-key-item.is-active {
                border-color: #00f2ff; background: rgba(0, 242, 255, 0.12);
                box-shadow: 0 0 10px rgba(0, 242, 255, 0.2);
            }
            .gugo-core-key-info {
                display: flex; align-items: center; gap: 8px; font-size: 0.84rem;
                color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .gugo-core-key-badge {
                font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;
                background: rgba(34, 197, 94, 0.2); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.4);
            }
            .gugo-core-key-del {
                background: none; border: none; color: #fda4af; cursor: pointer;
                padding: 4px 6px; border-radius: 6px; font-size: 0.84rem; transition: all 0.15s;
            }
            .gugo-core-key-del:hover { color: #ff4d4f; background: rgba(255, 77, 79, 0.15); }
            .gugo-core-add-row { display: flex; gap: 8px; margin-top: 10px; }
            .gugo-core-input {
                flex: 1; padding: 9px 11px; background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px;
                color: #fff; font-size: 0.86rem; outline: none; min-width: 0; box-sizing: border-box;
            }
            .gugo-core-input:focus { border-color: #00f2ff; }
            .gugo-core-btn-add {
                padding: 9px 14px; background: linear-gradient(135deg, #00f2ff, #0284c7);
                color: #0a0b10; border: none; border-radius: 8px; font-weight: 700;
                font-size: 0.84rem; cursor: pointer; white-space: nowrap; transition: all 0.2s;
            }
            .gugo-core-btn-add:hover { transform: translateY(-1px); box-shadow: 0 0 10px rgba(0, 242, 255, 0.35); }
            .gugo-core-btn-done {
                width: 100%; padding: 11px; border-radius: 8px; border: none;
                font-weight: 700; cursor: pointer; font-size: 0.92rem;
                background: #7000ff; color: #fff; transition: background 0.2s;
            }
            .gugo-core-btn-done:hover { background: #8519ff; }
            .gugo-core-toast {
                position: fixed; bottom: 84px; left: 50%; transform: translateX(-50%);
                background: rgba(18, 16, 26, 0.96); color: #fde68a;
                border: 1px solid rgba(245, 158, 11, 0.5); padding: 9px 18px;
                border-radius: 24px; font-size: 0.84rem; font-weight: 700;
                backdrop-filter: blur(12px); z-index: 10001; display: none;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6); max-width: 90vw;
                text-align: center; line-height: 1.45; pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    function resolveUILocale(explicitLang) {
        if (explicitLang && UI_I18N[explicitLang]) return explicitLang;
        const htmlLang = document.documentElement.getAttribute('data-ui-lang') || document.documentElement.lang || '';
        if (htmlLang && UI_I18N[htmlLang]) return htmlLang;
        for (const k of Object.keys(UI_I18N)) {
            if (htmlLang.startsWith(k.split('-')[0])) return k;
        }
        const nav = navigator.language || '';
        for (const k of Object.keys(UI_I18N)) {
            if (nav.startsWith(k.split('-')[0])) return k;
        }
        return 'zh-TW';
    }

    let toastTimer = null;
    function showToast(text, options = {}) {
        ensureUIStyles();
        let el = document.getElementById('gugo-core-toast-pill');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gugo-core-toast-pill';
            el.className = 'gugo-core-toast';
            document.body.appendChild(el);
        }
        el.textContent = text;
        el.style.display = 'block';
        clearTimeout(toastTimer);
        const duration = options.duration || 3600;
        toastTimer = setTimeout(() => { el.style.display = 'none'; }, duration);
    }

    function confirmDialog(message, onConfirm, options = {}) {
        ensureUIStyles();
        const locale = resolveUILocale(options.lang);
        const dict = UI_I18N[locale] || UI_I18N['zh-TW'];
        let modal = document.getElementById('gugo-core-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'gugo-core-confirm-modal';
            modal.className = 'gugo-core-overlay';
            modal.innerHTML = `
                <div class="gugo-core-modal" style="max-width:380px; text-align:center;">
                    <div style="font-size:2rem; margin-bottom:8px; color:#f59e0b;">⚠️</div>
                    <h3 class="gugo-core-title" id="gugo-confirm-title" style="margin-bottom:10px; font-size:1.1rem; color:#f8fafc;">${dict.confirmTitle}</h3>
                    <p class="gugo-core-p" id="gugo-confirm-msg" style="margin-bottom:18px; color:#cbd5e1; font-size:0.9rem; line-height:1.55;"></p>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button type="button" id="gugo-confirm-cancel" style="padding:9px 18px; border-radius:10px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#e0e0e0; cursor:pointer; font-weight:600; font-size:0.86rem;">${dict.cancelBtn}</button>
                        <button type="button" id="gugo-confirm-ok" style="padding:9px 18px; border-radius:10px; border:none; background:#ef4444; color:#fff; font-weight:700; cursor:pointer; font-size:0.86rem;">${dict.executeBtn}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const titleEl = document.getElementById('gugo-confirm-title');
        const msgEl = document.getElementById('gugo-confirm-msg');
        const btnCancel = document.getElementById('gugo-confirm-cancel');
        const btnOk = document.getElementById('gugo-confirm-ok');

        if (titleEl) titleEl.textContent = options.title || dict.confirmTitle;
        if (msgEl) msgEl.textContent = message;
        if (btnCancel) btnCancel.textContent = options.cancelBtnText || dict.cancelBtn;
        if (btnOk) btnOk.textContent = options.confirmBtnText || dict.executeBtn;

        modal.style.display = 'flex';
        const close = () => { modal.style.display = 'none'; };
        btnCancel.onclick = close;
        btnOk.onclick = () => {
            close();
            if (typeof onConfirm === 'function') onConfirm();
        };
    }

    function renderKeyItemsInsideModal(locale) {
        const listEl = document.getElementById('gugo-modal-keys-list');
        const countBadge = document.getElementById('gugo-modal-keys-count');
        if (!listEl) return;

        const dict = UI_I18N[locale] || UI_I18N['zh-TW'];
        const keys = getApiKeys();
        const activeIdx = state.activeKeyIndex;
        if (countBadge) countBadge.textContent = `${keys.length} ${dict.apiCountUnit}`;

        if (keys.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; padding:14px 8px; color:#94a3b8; font-size:0.8rem; line-height:1.5;">${dict.apiEmptyList}</div>`;
            return;
        }

        listEl.innerHTML = keys.map((k, idx) => {
            const isActive = idx === activeIdx;
            const masked = maskApiKey(k);
            return `
                <div class="gugo-core-key-item ${isActive ? 'is-active' : ''}" onclick="window.GugoAICore.selectKeyFromModal(${idx})">
                    <div class="gugo-core-key-info">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${isActive ? '#00f2ff' : 'rgba(255,255,255,0.2)'};"></span>
                        <span style="font-family:'Courier New', monospace; font-weight:700;">${masked}</span>
                        ${isActive ? `<span class="gugo-core-key-badge">${dict.apiActiveBadge}</span>` : ''}
                    </div>
                    <button type="button" class="gugo-core-key-del" title="${dict.apiDeleteKeyTitle}" onclick="event.stopPropagation(); window.GugoAICore.deleteKeyFromModal(${idx})">
                        🗑️
                    </button>
                </div>
            `;
        }).join('');
    }

    function openApiKeyModal(explicitLang) {
        ensureUIStyles();
        const locale = resolveUILocale(explicitLang);
        const dict = UI_I18N[locale] || UI_I18N['zh-TW'];
        let modal = document.getElementById('gugo-core-api-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'gugo-core-api-modal';
            modal.className = 'gugo-core-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="gugo-core-modal">
                <div class="gugo-core-header">
                    <h3 class="gugo-core-title">${dict.apiTitle}</h3>
                    <button type="button" class="gugo-core-close" onclick="window.GugoAICore.closeApiKeyModal()">✕</button>
                </div>
                <p class="gugo-core-p">${dict.apiCopy}</p>
                <div class="gugo-core-notice">${dict.apiNoticeFree}</div>
                <div class="gugo-core-notice">${dict.apiNoticeLocal}</div>
                <a class="gugo-core-tutorial-link" href="https://gugopro.com/tools/tutorials/how-to-get-gemini-api-key.html" target="_blank" rel="noopener">${dict.apiTutorialLink}</a>
                
                <div class="gugo-core-keys-box">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:0.78rem; font-weight:700; color:#67e8f9;">🔑 ${dict.apiListTitle}</span>
                        <span id="gugo-modal-keys-count" style="font-size:0.7rem; color:#94a3b8;"></span>
                    </div>
                    <div class="gugo-core-keys-list" id="gugo-modal-keys-list"></div>
                    <div class="gugo-core-add-row">
                        <input id="gugo-modal-key-input" class="gugo-core-input" placeholder="${dict.apiPlaceholder}" type="password" autocomplete="off" spellcheck="false">
                        <button type="button" class="gugo-core-btn-add" id="gugo-modal-add-btn">＋ ${dict.apiAddBtn}</button>
                    </div>
                </div>

                <button type="button" class="gugo-core-btn-done" onclick="window.GugoAICore.closeApiKeyModal()">${dict.apiDoneBtn}</button>
            </div>
        `;

        renderKeyItemsInsideModal(locale);
        modal.style.display = 'flex';

        const addBtn = document.getElementById('gugo-modal-add-btn');
        const inputEl = document.getElementById('gugo-modal-key-input');
        if (addBtn && inputEl) {
            addBtn.onclick = () => {
                const val = inputEl.value.trim();
                const res = addApiKey(val);
                if (res.success) {
                    inputEl.value = '';
                    renderKeyItemsInsideModal(locale);
                    showToast(dict.apiAddSuccess);
                } else {
                    showToast(`⚠️ ${res.message}`);
                }
            };
            inputEl.onkeydown = (e) => {
                if (e.key === 'Enter') addBtn.click();
            };
        }
    }

    function closeApiKeyModal() {
        const modal = document.getElementById('gugo-core-api-modal');
        if (modal) modal.style.display = 'none';
    }

    window.GugoAICore = {
        getApiKey,
        setApiKey,
        getApiKeys,
        hasApiKey,
        addApiKey,
        removeApiKey,
        setActiveKeyIndex,
        getActiveKeyIndex: () => state.activeKeyIndex,
        maskApiKey,
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
        getFriendlyErrorMessage,
        // 全新共用 UI 組件介面
        openApiKeyModal,
        closeApiKeyModal,
        confirm: confirmDialog,
        showToast,
        selectKeyFromModal: (idx) => {
            setActiveKeyIndex(idx);
            const locale = resolveUILocale();
            renderKeyItemsInsideModal(locale);
            const dict = UI_I18N[locale] || UI_I18N['zh-TW'];
            showToast(dict.apiSwitchSuccess.replace('{index}', String(idx + 1)));
        },
        deleteKeyFromModal: (idx) => {
            const keys = getApiKeys();
            const target = keys[idx];
            const masked = maskApiKey(target);
            const locale = resolveUILocale();
            const dict = UI_I18N[locale] || UI_I18N['zh-TW'];
            confirmDialog(
                dict.confirmDeleteMsg.replace('{key}', masked),
                () => {
                    removeApiKey(idx);
                    renderKeyItemsInsideModal(locale);
                    showToast(dict.confirmDeleteTitle + ' ✓');
                },
                { title: dict.confirmDeleteTitle, lang: locale }
            );
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadApiKeys();
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