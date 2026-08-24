(function () {
    'use strict';
    var C = window.ConverterCommon || {};
    function get(id) { return document.getElementById(id); }
    function en() { return /^en(?:-|$)/i.test(document.documentElement.lang || ''); }
    function tr(zh, english) { return en() ? english : zh; }
    function R(n, d) {
        if (d === 0n) throw new Error('zero denominator');
        if (d < 0n) { n = -n; d = -d; }
        return { n: n, d: d };
    }
    function add(a, b) { return R(a.n * b.d + b.n * a.d, a.d * b.d); }
    function sub(a, b) { return R(a.n * b.d - b.n * a.d, a.d * b.d); }
    function mul(a, b) { return R(a.n * b.n, a.d * b.d); }
    function div(a, b) { if (b.n === 0n) throw new Error('division by zero'); return R(a.n * b.d, a.d * b.n); }
    function ten(power) { return power >= 0 ? 10n ** BigInt(power) : 1n; }
    function parseDecimal(text) {
        var value = String(text || '').trim(), match = value.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
        if (!match) return null;
        var sign = match[1] === '-' ? -1n : 1n;
        var whole = match[2] || '0', fraction = match[3] !== undefined ? match[3] : (match[4] || '');
        var exponent = Number(match[5] || 0), digits = (whole + fraction).replace(/^0+(?=\d)/, '') || '0';
        var numerator = sign * BigInt(digits), denominator = 10n ** BigInt(fraction.length);
        if (exponent >= 0) numerator *= 10n ** BigInt(exponent); else denominator *= 10n ** BigInt(-exponent);
        return R(numerator, denominator);
    }
    function parseFraction(text) {
        var value = String(text || '').trim(), mixed = value.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/), simple = value.match(/^([+-]?\d+)\/(\d+)$/);
        if (mixed) {
            var whole = parseDecimal(mixed[1]), numerator = BigInt(mixed[2]), denominator = BigInt(mixed[3]);
            if (denominator === 0n) return null;
            var fraction = R(numerator, denominator);
            return whole.n < 0n ? sub(whole, fraction) : add(whole, fraction);
        }
        if (simple) {
            var top = BigInt(simple[1]), bottom = BigInt(simple[2]);
            return bottom === 0n ? null : R(top, bottom);
        }
        return parseDecimal(value);
    }
    function parsePace(text) {
        var value = String(text || '').trim(), parts = value.split(':');
        if (parts.length === 2) {
            var minutes = parseDecimal(parts[0]), seconds = parseDecimal(parts[1]);
            if (!minutes || !seconds || minutes.n < 0n || seconds.n < 0n || seconds.n >= 60n * seconds.d) return null;
            return add(mul(minutes, R(60n, 1n)), seconds);
        }
        return parseFraction(value);
    }
    function parseValue(text, unit) { return unit.special === 'pace' ? parsePace(text) : parseFraction(text); }
    function roundInt(n, d) {
        var sign = n < 0n ? -1n : 1n, value = n < 0n ? -n : n, quotient = value / d, remainder = value % d;
        if (remainder * 2n >= d) quotient += 1n;
        return sign * quotient;
    }
    function decimalString(value, places) {
        var sign = value.n < 0n ? '-' : '', n = value.n < 0n ? -value.n : value.n, integer = n / value.d, remainder = n % value.d;
        if (remainder === 0n) return sign + integer.toString();
        var digits = '', i;
        for (i = 0; i < places + 1; i++) { remainder *= 10n; digits += (remainder / value.d).toString(); remainder %= value.d; }
        var guard = Number(digits.charAt(places) || '0'); digits = digits.slice(0, places);
        if (guard >= 5) {
            var rounded = BigInt((integer.toString() + digits).replace(/^0+(?=\d)/, '') || '0') + 1n;
            var raw = rounded.toString(), split = raw.length > places ? [raw.slice(0, -places), raw.slice(-places)] : ['0', raw.padStart(places, '0')];
            integer = BigInt(split[0]); digits = split[1];
        }
        digits = digits.replace(/0+$/, '');
        return sign + integer.toString() + (digits ? '.' + digits : '');
    }
    function scientific(value) {
        var decimal = decimalString(value, 18), sign = decimal.charAt(0) === '-' ? '-' : '', raw = sign ? decimal.slice(1) : decimal, parts = raw.split('.'), whole = parts[0], fraction = parts[1] || '', digits, exponent;
        if (whole !== '0') { digits = whole + fraction; exponent = whole.length - 1; }
        else { var zeros = (fraction.match(/^0*/) || [''])[0].length; digits = fraction.slice(zeros); exponent = -(zeros + 1); }
        digits = (digits || '0').replace(/0+$/, '');
        var mantissa = digits.charAt(0) + (digits.length > 1 ? '.' + digits.slice(1, 16) : '');
        return sign + mantissa + 'e' + (exponent >= 0 ? '+' : '') + exponent;
    }
    function format(value) {
        var output = decimalString(value, 18), unsigned = output.charAt(0) === '-' ? output.slice(1) : output, parts = unsigned.split('.'), fraction = parts[1] || '', zeros = (fraction.match(/^0*/) || [''])[0].length;
        if (parts[0].length > 15 || (parts[0] === '0' && zeros >= 5)) return scientific(value);
        return output === '-0' ? '0' : output;
    }
    function fixed(value, places) {
        var scale = 10n ** BigInt(places), scaled = roundInt(value.n * scale, value.d), sign = scaled < 0n ? '-' : '', absolute = scaled < 0n ? -scaled : scaled, text = absolute.toString().padStart(places + 1, '0');
        return sign + text.slice(0, -places) + '.' + text.slice(-places);
    }
    function formatPace(value) {
        var hundredths = roundInt(value.n * 100n, value.d), sign = hundredths < 0n ? '-' : '', absolute = hundredths < 0n ? -hundredths : hundredths, minutes = absolute / 6000n, seconds = absolute % 6000n, wholeSeconds = seconds / 100n, centis = seconds % 100n;
        return sign + minutes.toString() + ':' + wholeSeconds.toString().padStart(2, '0') + (centis ? '.' + centis.toString().padStart(2, '0') : '');
    }
    function factor(unit) { return parseDecimal(unit.factor || '1'); }
    function toBase(value, unit) {
        if (unit.special === 'fahrenheit') return mul(sub(value, parseDecimal('32')), parseFraction('5/9'));
        if (unit.special === 'kelvin') return sub(value, parseDecimal('273.15'));
        if (unit.special === 'rankine') return mul(sub(value, parseDecimal('491.67')), parseFraction('5/9'));
        if (unit.special === 'pace') return div(parseDecimal('1000'), value);
        return mul(value, factor(unit));
    }
    function fromBase(value, unit) {
        if (unit.special === 'fahrenheit') return add(mul(value, parseFraction('9/5')), parseDecimal('32'));
        if (unit.special === 'kelvin') return add(value, parseDecimal('273.15'));
        if (unit.special === 'rankine') return add(mul(value, parseFraction('9/5')), parseDecimal('491.67'));
        if (unit.special === 'pace') return div(parseDecimal('1000'), value);
        return div(value, factor(unit));
    }
    function display(value, unit) { return unit.special === 'pace' ? formatPace(value) : format(value); }
    function safe(value) { return String(value).replace(/[&<>"']/g, function (character) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]; }); }

    function init(config) {
        var sourceInput = get('unit-source-input'), sourceUnit = get('unit-source-unit'), matrix = get('unit-matrix'), sampleButton = get('unit-sample'), clearButton = get('unit-clear'), reference = get('unit-reference-basis'), units = config.units || [], rows = {};
        if (!sourceInput || !sourceUnit || !matrix || !units.length) return;
        sourceUnit.innerHTML = units.map(function (unit) { return '<option value="' + safe(unit.key) + '">' + safe(unit.label) + '</option>'; }).join('');
        matrix.innerHTML = units.map(function (unit) { return '<div class="unit-result-row" data-unit-row="' + safe(unit.key) + '"><div class="unit-result-meta"><strong>' + safe(unit.label) + '</strong><small>' + safe(unit.reference) + '</small></div><input class="unit-result-value" data-unit-input="' + safe(unit.key) + '" type="text" inputmode="decimal" autocomplete="off" aria-label="' + safe(unit.label) + '"><button class="converter-button secondary unit-copy-button" data-unit-copy="' + safe(unit.key) + '" type="button"><i class="fa-solid fa-copy"></i> ' + (en() ? 'Copy' : '複製') + '</button></div>'; }).join('');
        units.forEach(function (unit) { rows[unit.key] = { spec: unit, input: matrix.querySelector('[data-unit-input="' + unit.key + '"]') }; });
        function setProgress(value) { if (C.setProgress) C.setProgress(get('unit-progress-bar'), get('unit-progress-label'), value); }
        function setStatus(message, kind) { if (C.setStatus) C.setStatus(get('unit-status'), message, kind); else get('unit-status').textContent = message; }
        function updateReference(unit) { reference.textContent = unit.referenceBasis || (en() ? 'All results use the selected source unit as the exact basis.' : '所有結果以目前選取單位作為精確換算基準。'); }
        function renderFrom(key, raw, preserveRaw) {
            var unit = rows[key] && rows[key].spec, parsed = unit && parseValue(raw, unit);
            if (!parsed) { setProgress(0); setStatus(tr('請輸入有效數字、科學記號或分數，例如 1/8、1 1/2、3.2e-7。', 'Enter a valid decimal, scientific notation or fraction such as 1/8, 1 1/2 or 3.2e-7.'), 'error'); return false; }
            try {
                var base = toBase(parsed, unit);
                units.forEach(function (target) { var targetValue = display(fromBase(base, target), target); rows[target.key].input.value = target.key === key && preserveRaw ? raw : targetValue; });
                sourceInput.value = raw; sourceUnit.value = key; updateReference(unit); setProgress(100); setStatus(tr('已在瀏覽器本機完成全單位矩陣換算。', 'All units converted locally in the browser.'), 'success'); return true;
            } catch (error) { setProgress(0); setStatus(tr('目前數值超出可處理範圍，請調整輸入後再試。', 'This value is outside the supported range; adjust the input and try again.'), 'error'); return false; }
        }
        units.forEach(function (unit) {
            rows[unit.key].input.addEventListener('input', function () { sourceInput.value = this.value; sourceUnit.value = unit.key; renderFrom(unit.key, this.value, true); });
            rows[unit.key].input.addEventListener('blur', function () { var parsed = parseValue(this.value, unit); if (parsed) this.value = display(parsed, unit); });
        });
        sourceInput.addEventListener('input', function () { renderFrom(sourceUnit.value, this.value, true); });
        sourceUnit.addEventListener('change', function () { renderFrom(sourceUnit.value, sourceInput.value, true); });
        matrix.querySelectorAll('[data-unit-copy]').forEach(function (button) { button.addEventListener('click', function () { var input = rows[button.getAttribute('data-unit-copy')].input, value = input.value; if (!value) return; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(function () { setStatus(tr('結果已複製，資料未離開瀏覽器。', 'Result copied; the data stayed in your browser.'), 'success'); }); }); });
        sampleButton.addEventListener('click', function () { sourceUnit.value = config.sampleUnit || units[0].key; sourceInput.value = config.sample || '1'; renderFrom(sourceUnit.value, sourceInput.value, true); });
        clearButton.addEventListener('click', function () { sourceInput.value = ''; units.forEach(function (unit) { rows[unit.key].input.value = ''; }); setProgress(0); setStatus(tr('已清除本機換算內容。', 'Local conversion cleared.')); });
        sourceUnit.value = config.sampleUnit || units[0].key; sourceInput.value = config.sample || '1'; renderFrom(sourceUnit.value, sourceInput.value, true);
    }
    window.UnitTools = { init: init };
}());
