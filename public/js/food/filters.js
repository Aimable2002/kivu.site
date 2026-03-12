import { renderFeed } from './feed.js';

// Single shared state for all filters including search
const state = { open: false, rating: false, tags: [], search: '' };

export function toggleOpen(btn) {
    state.open = !state.open;
    btn.classList.toggle('bg-coral',      state.open);
    btn.classList.toggle('text-white',    state.open);
    btn.classList.toggle('bg-gray-50',   !state.open);
    btn.classList.toggle('text-gray-600',!state.open);
    _refresh();
}

export function toggleRating(btn) {
    state.rating = !state.rating;
    btn.classList.toggle('bg-coral',      state.rating);
    btn.classList.toggle('text-white',    state.rating);
    btn.classList.toggle('bg-gray-50',   !state.rating);
    btn.classList.toggle('text-gray-600',!state.rating);
    _refresh();
}

export function toggleTag(tag, btn) {
    const idx = state.tags.indexOf(tag);
    if (idx === -1) {
        state.tags.push(tag);
        btn.classList.add('bg-coral','text-white');
        btn.classList.remove('bg-gray-50','text-gray-600');
    } else {
        state.tags.splice(idx, 1);
        btn.classList.remove('bg-coral','text-white');
        btn.classList.add('bg-gray-50','text-gray-600');
    }
    _refresh();
}

// Called from search input in index.html
export function setSearch(term) {
    state.search = term.trim();
    _refresh();
}

export function clearAll() {
    state.open   = false;
    state.rating = false;
    state.tags   = [];
    state.search = '';
    document.getElementById('search-input').value = '';
    _refresh();
}

function _refresh() {
    renderFeed(1, {
        open:   state.open,
        rating: state.rating,
        tags:   state.tags,
        search: state.search || undefined
    });
}