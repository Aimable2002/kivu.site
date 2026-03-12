import { supabase } from '../supabase.js';

export async function loadAdminBooks() {
    const container = document.getElementById('admin-books-list');
    if (!container) return;
    container.innerHTML = `<p class="text-gray-400 text-sm text-center py-6 animate-pulse">Loading...</p>`;

    const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    if (error || !data?.length) {
        container.innerHTML = `<p class="text-gray-400 text-sm text-center py-6">No books yet.</p>`; return;
    }

    container.innerHTML = data.map(b => `
    <div class="bg-white rounded-xl border border-gray-100 p-3 mb-2 flex justify-between items-center">
        <div>
            <p class="font-bold text-sm text-gray-900">${b.title}</p>
            <p class="text-xs text-gray-400">${b.category} · ${b.format.toUpperCase()} · ${b.file_size_label || '–'}</p>
        </div>
        <button onclick="window._deleteBook('${b.id}')"
                class="text-red-400 hover:text-red-600 text-sm transition">
            <i class="fas fa-trash"></i>
        </button>
    </div>`).join('');
}

export async function addBook() {
    const fields = {
        title:          document.getElementById('b-title')?.value.trim(),
        description:    document.getElementById('b-desc')?.value.trim(),
        category:       document.getElementById('b-category')?.value,
        language:       document.getElementById('b-language')?.value || 'EN',
        format:         document.getElementById('b-format')?.value,
        file_size_label:document.getElementById('b-size')?.value.trim(),
        r2_url:         document.getElementById('b-url')?.value.trim(),
    };

    const msg = document.getElementById('b-msg');
    if (!fields.title || !fields.r2_url) {
        showMsg(msg, 'Title and R2 URL are required.', 'text-red-500'); return;
    }

    const { error } = await supabase.from('books').insert(fields);
    if (error) { showMsg(msg, 'Failed: ' + error.message, 'text-red-500'); return; }

    showMsg(msg, '✓ Book added.', 'text-green-600');
    ['b-title','b-desc','b-size','b-url'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    loadAdminBooks();
}

export async function deleteBook(id) {
    if (!confirm('Delete this book?')) return;
    await supabase.from('books').delete().eq('id', id);
    loadAdminBooks();
}

export async function loadAdminDictionary() {
    const container = document.getElementById('admin-dict-list');
    if (!container) return;
    container.innerHTML = `<p class="text-gray-400 text-sm text-center py-6 animate-pulse">Loading...</p>`;

    const { data, error } = await supabase.from('dictionary_entries').select('*').order('created_at', { ascending: false }).limit(50);
    if (error || !data?.length) {
        container.innerHTML = `<p class="text-gray-400 text-sm text-center py-6">No entries yet.</p>`; return;
    }

    container.innerHTML = data.map(e => `
    <div class="bg-white rounded-xl border border-gray-100 p-3 mb-2 flex justify-between items-start">
        <div>
            <p class="font-bold text-sm text-gray-900">${e.word} <span class="text-gray-400 font-normal text-xs">(${e.language_from} → ${e.language_to})</span></p>
            <p class="text-xs text-gray-500">${e.definition}</p>
        </div>
        <button onclick="window._deleteEntry('${e.id}')"
                class="text-red-400 hover:text-red-600 text-sm transition ml-2 shrink-0">
            <i class="fas fa-trash"></i>
        </button>
    </div>`).join('');
}

export async function addEntry() {
    const fields = {
        word:           document.getElementById('d-word')?.value.trim(),
        language_from:  document.getElementById('d-from')?.value,
        language_to:    document.getElementById('d-to')?.value,
        part_of_speech: document.getElementById('d-pos')?.value.trim(),
        definition:     document.getElementById('d-def')?.value.trim(),
        example:        document.getElementById('d-example')?.value.trim(),
    };

    const msg = document.getElementById('d-msg');
    if (!fields.word || !fields.definition) {
        showMsg(msg, 'Word and definition are required.', 'text-red-500'); return;
    }

    const { error } = await supabase.from('dictionary_entries').insert(fields);
    if (error) { showMsg(msg, 'Failed: ' + error.message, 'text-red-500'); return; }

    showMsg(msg, '✓ Entry added.', 'text-green-600');
    ['d-word','d-pos','d-def','d-example'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    loadAdminDictionary();
}

export async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    await supabase.from('dictionary_entries').delete().eq('id', id);
    loadAdminDictionary();
}

function showMsg(el, text, cls) {
    if (!el) return;
    el.textContent = text;
    el.className   = `text-sm mt-2 font-medium text-center ${cls}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}