// /js/match/chat.js
// ─────────────────────────────────────────────────────────────────────
//  KivuMatch — Supabase Realtime Chat
//  Import this in dating.html replacing the <script> block
// ─────────────────────────────────────────────────────────────────────
import { supabase } from '/js/supabase.js';

// ═══════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════
let _myId          = null;   // auth.uid()
let _currentMatchId = null;
let _channel        = null;  // realtime channel for current chat
let _presenceCh     = null;  // presence channel
let _typingTimer    = null;

// ═══════════════════════════════════════════════════════════════════
//  INIT — call once on page load
// ═══════════════════════════════════════════════════════════════════
export async function initMatch() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // Not logged in — redirect to auth
        window.location.href = '/auth?next=/match';
        return;
    }
    _myId = user.id;

    // Mark online
    await supabase.rpc('set_user_online', { p_user_id: _myId, p_online: true });

    // Presence channel (global — shows green dots)
    _presenceCh = supabase.channel('global-presence', { config: { presence: { key: _myId } } });
    _presenceCh.on('presence', { event: 'sync' }, () => updateAllOnlineDots(_presenceCh.presenceState()))
               .subscribe(async status => {
                   if (status === 'SUBSCRIBED') {
                       await _presenceCh.track({ online_at: new Date().toISOString() });
                       setRealtimeStatus(true);
                   }
               });

    // Mark offline on page unload
    window.addEventListener('beforeunload', () => {
        supabase.rpc('set_user_online', { p_user_id: _myId, p_online: false });
    });

    // Load chat list
    await loadChatList();
}

// ═══════════════════════════════════════════════════════════════════
//  CHAT LIST
// ═══════════════════════════════════════════════════════════════════
export async function loadChatList() {
    const { data: matches, error } = await supabase
        .from('match_matches')
        .select(`
            id,
            user_a, user_b,
            profile_a:match_profiles!match_matches_user_a_fkey(id, display_name, photo_url),
            profile_b:match_profiles!match_matches_user_b_fkey(id, display_name, photo_url),
            last_msg:match_messages(content, created_at, sender_id)
        `)
        .or(`user_a.eq.${_myId},user_b.eq.${_myId}`)
        .order('created_at', { referencedTable: 'match_messages', ascending: false })
        .limit(1, { referencedTable: 'match_messages' });

    if (error) { console.error('loadChatList:', error); return; }

    renderChatList(matches || []);
}

function renderChatList(matches) {
    const el = document.getElementById('chat-list');
    if (!matches.length) {
        el.innerHTML = '<p class="text-xs text-gray-500 italic text-center py-6">No matches yet. Keep swiping! 💕</p>';
        return;
    }

    el.innerHTML = matches.map(m => {
        const isA    = m.user_a === _myId;
        const other  = isA ? m.profile_b : m.profile_a;
        const lastMsg = m.last_msg?.[0];
        const preview = lastMsg?.content || 'Say hi! 👋';
        const time    = lastMsg ? relativeTime(lastMsg.created_at) : '';
        const unread  = lastMsg && lastMsg.sender_id !== _myId && !lastMsg.is_read;

        return `
        <div onclick="openChat('${m.id}','${other.id}')"
             id="chat-row-${m.id}"
             class="flex items-center gap-4 p-3 rounded-2xl cursor-pointer hover:bg-white/5 active:bg-white/10 transition mb-1">
            <div class="relative shrink-0">
                <img src="${other.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(other.display_name)}"
                     class="w-14 h-14 rounded-full object-cover border border-white/10">
                <div id="dot-${other.id}" class="hidden absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full"></div>
            </div>
            <div class="flex-1 border-b border-white/5 pb-3 min-w-0">
                <div class="flex justify-between items-center mb-0.5">
                    <h4 class="font-bold text-sm text-white">${other.display_name}</h4>
                    <span class="text-[9px] text-gray-500 shrink-0 ml-2">${time}</span>
                </div>
                <p class="text-xs ${unread ? 'text-gray-100 font-bold' : 'text-gray-400'} line-clamp-1">${preview}</p>
            </div>
            ${unread ? '<span class="w-2.5 h-2.5 bg-match-accent rounded-full shrink-0"></span>' : ''}
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════
//  OPEN CHAT ROOM
// ═══════════════════════════════════════════════════════════════════
export async function openChat(matchId, otherId) {
    _currentMatchId = matchId;

    // Fetch other user's profile
    const { data: other } = await supabase
        .from('match_profiles')
        .select('display_name, photo_url')
        .eq('id', otherId)
        .single();

    // UI
    document.getElementById('chat-avatar').src  = other?.photo_url || '';
    document.getElementById('chat-name').textContent   = other?.display_name || '…';

    // Online status from presence state
    const isOnline = _presenceCh
        ? Object.values(_presenceCh.presenceState()).some(p => p.some(u => u.user_id === otherId))
        : false;
    document.getElementById('chat-status').textContent = isOnline ? 'Online' : 'Offline';
    document.getElementById('chat-status').className   = `text-[10px] ${isOnline ? 'text-green-400' : 'text-gray-500'}`;
    document.getElementById('chat-online-dot').classList.toggle('hidden', !isOnline);

    // Switch view
    ['view-discover','view-likes','view-chats'].forEach(v => document.getElementById(v).classList.add('hidden'));
    document.getElementById('view-chatroom').classList.remove('hidden');

    // Load history
    await loadMessageHistory(matchId);

    // Mark received messages read
    await supabase.from('match_messages')
        .update({ is_read: true })
        .eq('match_id', matchId)
        .neq('sender_id', _myId);

    // Subscribe realtime
    subscribeToChat(matchId);

    document.getElementById('chat-input').focus();
}

// ─────────────────────────────────────────────────────────────────────
async function loadMessageHistory(matchId) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    const { data, error } = await supabase
        .from('match_messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })
        .limit(100);

    if (error) { console.error('loadMessageHistory:', error); return; }
    (data || []).forEach(msg => appendMessage(msg));
    scrollToBottom();
}

// ─────────────────────────────────────────────────────────────────────
function subscribeToChat(matchId) {
    // Unsubscribe from previous chat
    if (_channel) supabase.removeChannel(_channel);

    _channel = supabase
        .channel(`chat:${matchId}`)
        // New messages
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'match_messages',
            filter: `match_id=eq.${matchId}`
        }, payload => {
            if (payload.new.sender_id === _myId) return; // already rendered
            document.getElementById('typing-indicator').classList.add('hidden');
            appendMessage(payload.new);
            scrollToBottom();
            // Mark read immediately
            supabase.from('match_messages').update({ is_read: true }).eq('id', payload.new.id);
        })
        // Typing events (broadcast — no DB write needed)
        .on('broadcast', { event: 'typing' }, () => showTypingIndicator())
        .subscribe(status => {
            setRealtimeStatus(status === 'SUBSCRIBED');
        });
}

export function unsubscribeFromChat() {
    if (_channel) { supabase.removeChannel(_channel); _channel = null; }
    _currentMatchId = null;
}

// ═══════════════════════════════════════════════════════════════════
//  SEND MESSAGE
// ═══════════════════════════════════════════════════════════════════
export async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text || !_currentMatchId) return;

    input.value = '';

    // Optimistic render
    appendMessage({ sender_id: _myId, content: text, created_at: new Date().toISOString() });
    scrollToBottom();

    const { error } = await supabase.from('match_messages').insert({
        match_id:  _currentMatchId,
        sender_id: _myId,
        content:   text,
    });
    if (error) console.error('sendMessage:', error);
}

// ─────────────────────────────────────────────────────────────────────
function appendMessage(msg) {
    const isMe = msg.sender_id === _myId;
    const time  = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const div   = document.createElement('div');
    div.className = `flex ${isMe ? 'justify-end' : 'justify-start'} fade-in`;
    div.innerHTML = `
        <div class="max-w-[72%]">
            <div class="${isMe ? 'bubble-me' : 'bubble-them'} px-4 py-2.5 text-sm leading-snug">${escHtml(msg.content)}</div>
            <p class="text-[9px] text-gray-600 mt-0.5 ${isMe ? 'text-right' : ''}">${time}</p>
        </div>`;
    document.getElementById('chat-messages').appendChild(div);
}

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════════════════════════
//  TYPING BROADCAST
// ═══════════════════════════════════════════════════════════════════
export function onTyping() {
    if (!_channel) return;
    _channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: _myId } });
}

function showTypingIndicator() {
    document.getElementById('typing-indicator').classList.remove('hidden');
    scrollToBottom();
    clearTimeout(_typingTimer);
    _typingTimer = setTimeout(() => {
        document.getElementById('typing-indicator').classList.add('hidden');
    }, 2500);
}

// ═══════════════════════════════════════════════════════════════════
//  SWIPES
// ═══════════════════════════════════════════════════════════════════
export async function recordSwipe(swipedId, direction) {
    if (!_myId) return;
    const { error } = await supabase.from('match_swipes').insert({
        swiper_id: _myId,
        swiped_id: swipedId,
        direction,
    });
    if (error && error.code !== '23505') console.error('recordSwipe:', error); // 23505 = duplicate, ignore
}

// ═══════════════════════════════════════════════════════════════════
//  DISCOVER FEED — load profiles to swipe
// ═══════════════════════════════════════════════════════════════════
export async function loadDiscoverProfiles() {
    if (!_myId) return [];

    // Get IDs already swiped
    const { data: swiped } = await supabase
        .from('match_swipes')
        .select('swiped_id')
        .eq('swiper_id', _myId);

    const excludeIds = [_myId, ...(swiped || []).map(s => s.swiped_id)];

    const { data, error } = await supabase
        .from('match_profiles')
        .select('id, display_name, age, photo_url, city, intent, religion, languages, interests, is_verified, is_vip')
        .eq('is_active', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(20);

    if (error) { console.error('loadDiscoverProfiles:', error); return []; }
    return data || [];
}

// ═══════════════════════════════════════════════════════════════════
//  PRESENCE HELPERS
// ═══════════════════════════════════════════════════════════════════
function updateAllOnlineDots(state) {
    const onlineIds = new Set(
        Object.values(state).flatMap(arr => arr.map(p => p.user_id)).filter(Boolean)
    );
    document.querySelectorAll('[id^="dot-"]').forEach(el => {
        const uid = el.id.replace('dot-', '');
        el.classList.toggle('hidden', !onlineIds.has(uid));
    });
}

// ═══════════════════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════════════════
function scrollToBottom() {
    const c = document.getElementById('chat-messages');
    setTimeout(() => c.scrollTop = c.scrollHeight, 50);
}

function setRealtimeStatus(connected) {
    const statusEl = document.getElementById('realtime-status');
    if (!statusEl) return;
    const dot  = statusEl.querySelector('span:first-child');
    const text = statusEl.querySelector('span:last-child');
    dot.className  = `w-2 h-2 rounded-full realtime-dot ${connected ? 'bg-green-400' : 'bg-red-500'}`;
    text.className = `text-[10px] font-bold ${connected ? 'text-green-400' : 'text-red-400'}`;
    text.textContent = connected ? 'Realtime connected' : 'Reconnecting...';
}

function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
