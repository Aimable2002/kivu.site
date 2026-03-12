import { supabase } from '../supabase.js';

export async function submitApplication() {
    const name  = document.getElementById('m-name')?.value.trim();
    const phone = document.getElementById('m-phone')?.value.trim();
    const lat   = document.getElementById('m-lat')?.value;
    const lng   = document.getElementById('m-lng')?.value;
    const msg   = document.getElementById('m-msg');

    if (!name)  { showMsg(msg, 'Restaurant name is required.', 'text-red-500');  return; }
    if (!phone) { showMsg(msg, 'Phone number is required.', 'text-red-500');     return; }
    if (!lat || !lng) { showMsg(msg, 'Please pin your location on the map.', 'text-red-500'); return; }

    // Collect checked tags
    const tags = Array.from(document.querySelectorAll('.tag-pill input[type=checkbox]:checked'))
        .map(cb => cb.value);

    const btn = document.getElementById('m-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

    const { error } = await supabase.from('merchant_applications').insert({
        name,
        description:     document.getElementById('m-desc')?.value.trim()    || null,
        category:        document.getElementById('m-category')?.value        || 'Restaurant',
        address:         document.getElementById('m-address')?.value.trim()  || null,
        lat:             parseFloat(lat),
        lng:             parseFloat(lng),
        phone,
        hours:           document.getElementById('m-hours')?.value.trim()    || null,
        youtube_url:     document.getElementById('m-youtube')?.value.trim()  || null,
        cover_image_url: document.getElementById('m-cover')?.value.trim()    || null,
        tags,
        status: 'pending'
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Submit Application'; }

    if (error) { showMsg(msg, 'Submission failed: ' + error.message, 'text-red-500'); return; }

    document.getElementById('m-form').classList.add('hidden');
    document.getElementById('m-success').classList.remove('hidden');
}

function showMsg(el, text, cls) {
    if (!el) return;
    el.textContent = text;
    el.className   = `text-sm mt-3 font-medium text-center ${cls}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}