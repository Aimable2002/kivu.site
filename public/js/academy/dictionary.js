/**
 * dictionary.js
 * Uses MyMemory API for live translation — no API key needed
 * Supabase dictionary_entries = admin-curated featured words only
 * Language codes: rw (Kinyarwanda), en (English), zh (Chinese)
 */

const LANG_CODE = {
    'Kinyarwanda': 'rw',
    'English':     'en',
    'Chinese':     'zh',
};

let _fromLang = 'Kinyarwanda';
let _toLang   = 'English';
let _debounce = null;

// ── INIT ──────────────────────────────────────────────────────────
export function initDictionary() {
    const input = document.getElementById('dict-input');
    if (!input) return;

    input.addEventListener('input', () => {
        clearTimeout(_debounce);
        const q = input.value.trim();
        if (!q) {
            document.getElementById('dict-result').classList.add('hidden');
            return;
        }
        _debounce = setTimeout(() => translate(q), 500);
    });
}

// ── TRANSLATE via MyMemory ────────────────────────────────────────
async function translate(word) {
    const resultEl = document.getElementById('dict-result');
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = `
    <div class="p-4 flex items-center gap-3 text-gray-400">
        <i class="fas fa-spinner fa-spin"></i>
        <span class="text-xs">Translating...</span>
    </div>`;

    const from = LANG_CODE[_fromLang] || 'en';
    const to   = LANG_CODE[_toLang]   || 'en';

    if (from === to) {
        resultEl.innerHTML = `<p class="p-4 text-xs text-gray-400">Select different languages.</p>`;
        return;
    }

    try {
        const url      = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${from}|${to}`;
        const res      = await fetch(url);
        const data     = await res.json();
        const status   = data.responseStatus;
        const matches  = data.matches || [];

        if (status !== 200 || !data.responseData?.translatedText) {
            resultEl.innerHTML = `<p class="p-4 text-xs text-red-400">Translation not available.</p>`;
            return;
        }

        const mainTranslation = data.responseData.translatedText;

        // Build alternative translations from matches (skip duplicates and machine quality < 50)
        const alternatives = matches
            .filter(m => m.translation !== mainTranslation && m.quality >= 50)
            .slice(0, 3)
            .map(m => m.translation);

        resultEl.innerHTML = `
        <div class="p-4">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">${_fromLang} → ${_toLang}</p>
                    <p class="text-xl font-black text-slate-800 leading-tight">${mainTranslation}</p>
                </div>
                <button onclick="speakWord('${mainTranslation.replace(/'/g, "\\'")}')"
                        class="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition shrink-0 ml-3">
                    <i class="fas fa-volume-up text-sm"></i>
                </button>
            </div>

            <div class="border-t border-gray-100 pt-3">
                <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Original</p>
                <p class="text-sm text-gray-600 font-medium">${word}</p>
            </div>

            ${alternatives.length ? `
            <div class="border-t border-gray-100 pt-3 mt-3">
                <p class="text-[10px] font-bold text-gray-400 uppercase mb-2">Other translations</p>
                <div class="flex flex-wrap gap-2">
                    ${alternatives.map(a => `
                    <span class="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-slate-200 transition"
                          onclick="document.getElementById('dict-input').value='${a.replace(/'/g,"\\'")}'; window._dictSearch('${a.replace(/'/g,"\\'")}')">
                        ${a}
                    </span>`).join('')}
                </div>
            </div>` : ''}
        </div>`;

    } catch (err) {
        resultEl.innerHTML = `<p class="p-4 text-xs text-red-400">Connection error. Try again.</p>`;
        console.error('[Dictionary]', err);
    }
}

// ── SPEAK ─────────────────────────────────────────────────────────
window.speakWord = function(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const toLangCode = LANG_CODE[_toLang];
    u.lang = toLangCode === 'zh' ? 'zh-CN' : toLangCode === 'rw' ? 'rw' : 'en-US';
    window.speechSynthesis.speak(u);
};

// Exposed for inline onclick in alternative chips
window._dictSearch = (word) => translate(word);

// ── LANGUAGE CONTROLS ─────────────────────────────────────────────
export function setFromLang(lang) {
    _fromLang = lang;
    const input = document.getElementById('dict-input');
    if (input?.value.trim()) translate(input.value.trim());
}

export function setToLang(lang) {
    _toLang = lang;
    const input = document.getElementById('dict-input');
    if (input?.value.trim()) translate(input.value.trim());
}

export function swapLanguages() {
    const tmp   = _fromLang;
    _fromLang   = _toLang;
    _toLang     = tmp;

    const fromEl = document.getElementById('dict-from');
    const toEl   = document.getElementById('dict-to');
    if (fromEl) fromEl.value = _fromLang;
    if (toEl)   toEl.value   = _toLang;

    const input = document.getElementById('dict-input');
    if (input?.value.trim()) translate(input.value.trim());
}