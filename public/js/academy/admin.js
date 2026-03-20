/**
 * admin.js
 * Manages books and dictionary entries via Supabase
 * Books: supports both URL input AND file upload to Supabase Storage
 * Dictionary: admin-curated entries stored in dictionary_entries table
 */

import { supabase } from '../supabase.js';

// ── BOOKS ─────────────────────────────────────────────────────────
export async function loadAdminBooks() {
    const el = document.getElementById('admin-books-list');
    el.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-4">Loading...</p>`;

    const { data, error } = await supabase
        .from('books')
        .select('id, title, category, language, format, file_size_label, download_count, created_at')
        .order('created_at', { ascending: false });

    if (error) { el.innerHTML = `<p class="text-xs text-red-400 text-center py-4">${error.message}</p>`; return; }
    if (!data.length) { el.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-4">No books yet.</p>`; return; }

    el.innerHTML = data.map(b => `
    <div class="bg-white border border-gray-200 rounded-xl p-3 mb-2 flex justify-between items-start">
        <div class="flex-1 min-w-0 pr-3">
            <p class="font-bold text-sm text-gray-900 leading-tight">${b.title}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">${b.category} · ${b.language} · ${b.format?.toUpperCase()}</p>
            <p class="text-[10px] text-gray-300 mt-0.5">⬇️ ${b.download_count || 0} downloads</p>
        </div>
        <button onclick="window._deleteBook('${b.id}')"
                class="text-red-400 hover:text-red-600 text-sm shrink-0 active:scale-95 transition">
            <i class="fas fa-trash"></i>
        </button>
    </div>`).join('');
}

export async function addBook() {
    const title    = document.getElementById('b-title').value.trim();
    const category = document.getElementById('b-category').value;
    const language = document.getElementById('b-language').value;
    const format   = document.getElementById('b-format').value;
    const size     = document.getElementById('b-size').value.trim();
    const desc     = document.getElementById('b-desc').value.trim();
    const msgEl    = document.getElementById('b-msg');

    const showMsg = (text, ok) => {
        msgEl.textContent = text;
        msgEl.className   = `text-xs font-medium text-center mt-2 ${ok ? 'text-green-600' : 'text-red-500'}`;
        msgEl.classList.remove('hidden');
        setTimeout(() => msgEl.classList.add('hidden'), 3000);
    };

    if (!title)    { showMsg('Title is required.', false); return; }
    if (!category) { showMsg('Category is required.', false); return; }

    // Determine source: upload or URL
    const fileInput  = document.getElementById('b-file');
    const urlInput   = document.getElementById('b-url');
    const uploadMode = document.getElementById('b-upload-mode')?.dataset.mode === 'upload';

    let r2_url = '';

    if (uploadMode && fileInput?.files?.length) {
        // Upload to Supabase Storage
        const file     = fileInput.files[0];
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

        showMsg('Uploading...', true);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('books')
            .upload(fileName, file, { contentType: file.type, upsert: false });

        if (uploadError) { showMsg(`Upload failed: ${uploadError.message}`, false); return; }

        const { data: urlData } = supabase.storage.from('books').getPublicUrl(fileName);
        r2_url = urlData.publicUrl;
    } else {
        r2_url = urlInput?.value.trim() || '';
        if (!r2_url) { showMsg('Please provide a file URL or upload a file.', false); return; }
    }

    const { error } = await supabase.from('books').insert({
        title, category, language, format,
        file_size_label: size || null,
        description:     desc || null,
        r2_url,
        download_count:  0,
    });

    if (error) { showMsg(error.message, false); return; }

    showMsg('Book added successfully!', true);

    // Reset form
    document.getElementById('b-title').value = '';
    document.getElementById('b-size').value  = '';
    document.getElementById('b-desc').value  = '';
    if (urlInput)  urlInput.value  = '';
    if (fileInput) fileInput.value = '';

    loadAdminBooks();
}

export async function deleteBook(id) {
    if (!confirm('Delete this book?')) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (!error) loadAdminBooks();
}

// ── DICTIONARY ────────────────────────────────────────────────────
export async function loadAdminDictionary() {
    const el = document.getElementById('admin-dict-list');
    el.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-4">Loading...</p>`;

    const { data, error } = await supabase
        .from('dictionary_entries')
        .select('id, word, language_from, language_to, part_of_speech, definition, example')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) { el.innerHTML = `<p class="text-xs text-red-400 text-center py-4">${error.message}</p>`; return; }
    if (!data.length) { el.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-4">No entries yet.</p>`; return; }

    el.innerHTML = data.map(d => `
    <div class="bg-white border border-gray-200 rounded-xl p-3 mb-2 flex justify-between items-start">
        <div class="flex-1 min-w-0 pr-3">
            <p class="font-bold text-sm text-gray-900">${d.word}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">${d.language_from} → ${d.language_to}${d.part_of_speech ? ` · ${d.part_of_speech}` : ''}</p>
            <p class="text-xs text-gray-600 mt-1 leading-snug">${d.definition}</p>
            ${d.example ? `<p class="text-[10px] text-gray-400 italic mt-0.5">"${d.example}"</p>` : ''}
        </div>
        <button onclick="window._deleteEntry('${d.id}')"
                class="text-red-400 hover:text-red-600 text-sm shrink-0 active:scale-95 transition">
            <i class="fas fa-trash"></i>
        </button>
    </div>`).join('');
}

export async function addEntry() {
    const word     = document.getElementById('d-word').value.trim();
    const from     = document.getElementById('d-from').value;
    const to       = document.getElementById('d-to').value;
    const pos      = document.getElementById('d-pos').value.trim();
    const def      = document.getElementById('d-def').value.trim();
    const example  = document.getElementById('d-example').value.trim();
    const msgEl    = document.getElementById('d-msg');

    const showMsg = (text, ok) => {
        msgEl.textContent = text;
        msgEl.className   = `text-xs font-medium text-center mt-2 ${ok ? 'text-green-600' : 'text-red-500'}`;
        msgEl.classList.remove('hidden');
        setTimeout(() => msgEl.classList.add('hidden'), 3000);
    };

    if (!word) { showMsg('Word is required.', false); return; }
    if (!def)  { showMsg('Definition is required.', false); return; }

    const { error } = await supabase.from('dictionary_entries').insert({
        word,
        language_from:  from,
        language_to:    to,
        part_of_speech: pos  || null,
        definition:     def,
        example:        example || null,
    });

    if (error) { showMsg(error.message, false); return; }

    showMsg('Entry added!', true);
    ['d-word','d-pos','d-def','d-example'].forEach(id => {
        document.getElementById(id).value = '';
    });
    loadAdminDictionary();
}

export async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('dictionary_entries').delete().eq('id', id);
    if (!error) loadAdminDictionary();
}