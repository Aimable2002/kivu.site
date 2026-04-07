# Kivu Backend — Supabase Setup Guide

## File Map

```
supabase/
  01_schema.sql                  ← Run first in SQL Editor
  02_rls.sql                     ← Run second
  functions/
    clinic-admin/index.ts        ← Edge Function (admin API)
    clinic-admin/admin_patch.html ← How to update admin.html fetch() calls

js/
  supabase.js                    ← Shared client (fill in your URL + key)
  clinic/
    feed.js                      ← Clinic listing feed
    detail.js                    ← Clinic detail page logic
    map.js                       ← Leaflet map overlay
  match/
    chat.js                      ← Dating realtime chat + swipes
```

---

## Step 1 — Create Supabase project

1. Go to https://supabase.com → New project
2. Note your **Project URL** and **anon key** (Settings → API)

---

## Step 2 — Run SQL

In **Dashboard → SQL Editor**:

1. Paste and run `01_schema.sql`
2. Paste and run `02_rls.sql`

---

## Step 3 — Enable Realtime on `match_messages`

Dashboard → **Database → Replication** → scroll to `match_messages` → toggle **on**.

---

## Step 4 — Fill in your credentials

In `js/supabase.js`:
```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

---

## Step 5 — Deploy Edge Function (Clinic Admin)

```bash
# Install Supabase CLI if needed
npm i -g supabase

# Link your project
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Set secrets
supabase secrets set ADMIN_PASSWORD=your_strong_password

# Deploy
supabase functions deploy clinic-admin
```

Then in `clinic/admin.html`, update:
```js
const EDGE_BASE = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/clinic-admin';
```

---

## Step 6 — Dating Auth

The dating module (`js/match/chat.js`) uses Supabase Auth.
Users must be signed in. Add a login page at `/auth`:

```js
// Sign up
await supabase.auth.signUp({ email, password });

// Sign in  
await supabase.auth.signInWithPassword({ email, password });

// OR use phone OTP (good for Rwanda mobile numbers)
await supabase.auth.signInWithOtp({ phone: '+250788...' });
```

After login, create a row in `match_profiles` with the user's `id`:
```js
await supabase.from('match_profiles').insert({
    id:           user.id,
    display_name: name,
    photo_url:    photoUrl,
    city:         'Kigali',
});
```

---

## Step 7 — Wire dating.html to real backend

Replace the `<script>` block in `dating.html` with:
```html
<script type="module">
    import { initMatch, sendMessage, onTyping, openChat, loadChatList, recordSwipe } from '/js/match/chat.js';

    await initMatch();

    window.sendMessage = sendMessage;
    window.onTyping    = onTyping;
    window.openChat    = openChat;
    window.closeChat   = () => {
        import('/js/match/chat.js').then(m => m.unsubscribeFromChat());
        document.getElementById('view-chatroom').classList.add('hidden');
        document.getElementById('view-chats').classList.remove('hidden');
    };
    window.swipe = async (direction) => {
        const card    = document.getElementById('tinder-card');
        const swipedId = card.dataset.profileId; // set this when you render cards
        card.classList.add(direction === 'left' ? 'swipe-left' : 'swipe-right');
        await recordSwipe(swipedId, direction);
        // load next card...
    };
</script>
```

---

## Database Table Summary

| Table                  | Purpose                                  |
|------------------------|------------------------------------------|
| `clinic_applications`  | Raw submissions from merchant form       |
| `clinics`              | Approved live clinics                    |
| `clinic_reviews`       | User reviews (auto-updates rating)       |
| `clinic_doctors`       | Doctors associated with a clinic         |
| `match_profiles`       | Dating user profiles                     |
| `match_swipes`         | Left/right swipes                        |
| `match_matches`        | Auto-created on mutual right swipe       |
| `match_messages`       | Chat messages (realtime enabled)         |
| `match_presence`       | Online/offline status                    |

---

## Realtime Architecture (Dating)

```
User A sends message
  → INSERT into match_messages
  → Supabase broadcasts to channel "chat:{matchId}"
  → User B's client receives postgres_changes event
  → appendMessage() renders the bubble in real time

Typing indicator:
  → channel.send({ type: 'broadcast', event: 'typing' })
  → No DB write — pure websocket broadcast
  → Disappears after 2.5s of silence

Online dots:
  → Supabase Presence tracks connected users
  → updateAllOnlineDots() reflects state on sync
  → match_presence table for persistent "last seen"
```
