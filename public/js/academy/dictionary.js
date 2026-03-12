import { supabase } from '../supabase.js';

let _fromLang = 'Kinyarwanda';
let _toLang   = 'English';
let _debounce = null;

export function initDictionary() {
    const input = document.getElementById('dict-input');
    if (!input) return;
    input.addEventListener('input', () => {
        clearTimeout(_debounce);
        _debounce = setTimeout(() => searchWord(input.value.trim()), 300);
    });
}

export function swapLanguages() {
    const tmp = _fromLang;
    _fromLang = _toLang;
    _toLang   = tmp;

    const fromEl = document.getElementById('dict-from');
    const toEl   = document.getElementById('dict-to');
    if (fromEl) fromEl.value = _fromLang;
    if (toEl)   toEl.value   = _toLang;

    const input = document.getElementById('dict-input');
    if (input?.value.trim()) searchWord(input.value.trim());
}

export function setFromLang(val) { _fromLang = val; }
export function setToLang(val)   { _toLang   = val; }

export async function searchWord(query) {
    const result = document.getElementById('dict-result');
    if (!result) return;

    if (!query) { result.classList.add('hidden'); return; }

    result.classList.remove('hidden');
    result.innerHTML = `<div class="text-center py-6 text-gray-300 text-sm animate-pulse">Searching...</div>`;

    const { data, error } = await supabase
        .from('dictionary_entries')
        .select('*')
        .ilike('word', `${query}%`)
        .eq('language_from', _fromLang)
        .eq('language_to', _toLang)
        .limit(5);

    if (error || !data?.length) {
        result.innerHTML = `
        <div class="p-4 text-center">
            <p class="text-gray-400 text-sm">No results for "<b>${query}</b>"</p>
            <p class="text-gray-300 text-xs mt-1">${_fromLang} → ${_toLang}</p>
        </div>`;
        return;
    }

    result.innerHTML = data.map((entry, i) => `
    <div class="${i < data.length - 1 ? 'border-b border-gray-100' : ''}">
        <div class="p-4 border-b border-gray-50">
            <h3 class="text-xl font-bold text-slate-900">${entry.word}</h3>
            ${entry.part_of_speech ? `<p class="text-sm text-slate-500 italic">${entry.part_of_speech}</p>` : ''}
        </div>
        <div class="p-4 bg-slate-50">
            <p class="text-slate-800 font-medium mb-2">${entry.definition}</p>
            ${entry.example ? `<p class="text-xs text-gray-500">${entry.example}</p>` : ''}
        </div>
    </div>`).join('');
}