import express          from 'express';
import { join }         from 'path';
import { fileURLToPath } from 'url';
import { dirname }      from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

const adminSupabase = createClient(
    process.env.SUPABASE_URL || 'https://zujnupfixfexwqedfgpn.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1am51cGZpeGZleHdxZWRmZ3BuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NjM2NCwiZXhwIjoyMDg4ODMyMzY0fQ._YbGO6EoOyKxVG1v6HStB1viTvCO71yrBoLcwnQOsvs"
);

app.use(express.json());

// JS files only — scoped to /js so static never touches /food/* routes
app.use('/js', express.static(join(__dirname, 'public/js')));

// ── ADMIN API ─────────────────────────────────────────────────
app.get('/api/admin/applications', async (req, res) => {
    const { data, error } = await adminSupabase
        .from('merchant_applications')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/admin/applications/:id/approve', async (req, res) => {
    const { error } = await adminSupabase
        .from('merchant_applications')
        .update({ status: 'approved' })
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

app.post('/api/admin/applications/:id/reject', async (req, res) => {
    const { error } = await adminSupabase
        .from('merchant_applications')
        .update({ status: 'rejected' })
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

// ── Saloon admin API ─────────────────────────────────────────────
app.get('/api/admin/saloon-applications', async (req, res) => {
    const { data, error } = await adminSupabase.from('saloon_applications').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/saloon-applications/:id/approve', async (req, res) => {
    const { error } = await adminSupabase.from('saloon_applications').update({ status: 'approved' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/saloon-applications/:id/reject', async (req, res) => {
    const { error } = await adminSupabase.from('saloon_applications').update({ status: 'rejected' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.get('/api/admin/saloons', async (req, res) => {
    const { data, error } = await adminSupabase.from('saloons').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/saloons/:id/vip', async (req, res) => {
    const { data } = await adminSupabase.from('saloons').select('is_vip').eq('id', req.params.id).single();
    await adminSupabase.from('saloons').update({ is_vip: !data.is_vip }).eq('id', req.params.id);
    res.json({ ok: true });
});
app.post('/api/admin/saloons/:id/open', async (req, res) => {
    const { data } = await adminSupabase.from('saloons').select('is_open').eq('id', req.params.id).single();
    await adminSupabase.from('saloons').update({ is_open: !data.is_open }).eq('id', req.params.id);
    res.json({ ok: true });
});

// ── Wellness admin API ────────────────────────────────────────────
app.get('/api/admin/wellness-applications', async (req, res) => {
    const { data, error } = await adminSupabase.from('wellness_applications').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/wellness-applications/:id/approve', async (req, res) => {
    const { error } = await adminSupabase.from('wellness_applications').update({ status: 'approved' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/wellness-applications/:id/reject', async (req, res) => {
    const { error } = await adminSupabase.from('wellness_applications').update({ status: 'rejected' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.get('/api/admin/wellness-centers', async (req, res) => {
    const { data, error } = await adminSupabase.from('wellness_centers').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/wellness-centers/:id/vip', async (req, res) => {
    const { data } = await adminSupabase.from('wellness_centers').select('is_vip').eq('id', req.params.id).single();
    await adminSupabase.from('wellness_centers').update({ is_vip: !data.is_vip }).eq('id', req.params.id);
    res.json({ ok: true });
});
app.post('/api/admin/wellness-centers/:id/open', async (req, res) => {
    const { data } = await adminSupabase.from('wellness_centers').select('is_open').eq('id', req.params.id).single();
    await adminSupabase.from('wellness_centers').update({ is_open: !data.is_open }).eq('id', req.params.id);
    res.json({ ok: true });
});

app.get('/api/admin/restaurants', async (req, res) => {
    const { data, error } = await adminSupabase
        .from('restaurants')
        .select('id, name, category, address, phone, is_vip, is_open, status, created_at')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/admin/restaurants/:id/vip', async (req, res) => {
    const { is_vip } = req.body;
    const { error } = await adminSupabase
        .from('restaurants').update({ is_vip }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

app.post('/api/admin/restaurants/:id/open', async (req, res) => {
    const { is_open } = req.body;
    const { error } = await adminSupabase
        .from('restaurants').update({ is_open }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

// ── PAGE ROUTES ───────────────────────────────────────────────
app.get('/',                (_, res) => res.sendFile(join(__dirname, 'public/index.html')));
app.get('/food',            (_, res) => res.sendFile(join(__dirname, 'public/food/index.html')));
app.get('/food/restaurant', (_, res) => res.sendFile(join(__dirname, 'public/food/restaurant.html')));
app.get('/food/merchant',   (_, res) => res.sendFile(join(__dirname, 'public/food/merchant.html')));
app.get('/food/admin',      (_, res) => res.sendFile(join(__dirname, 'public/food/admin.html')));
app.get('/academy',         (_, res) => res.sendFile(join(__dirname, 'public/academy/index.html')));
app.get('/academy/admin',   (_, res) => res.sendFile(join(__dirname, 'public/academy/admin.html')));

// ── Saloon module ─────────────────────────────────────────────────
app.get('/saloon',          (_, res) => res.sendFile(join(__dirname, 'public/saloon/index.html')));
app.get('/saloon/detail',   (_, res) => res.sendFile(join(__dirname, 'public/saloon/detail.html')));
app.get('/saloon/merchant', (_, res) => res.sendFile(join(__dirname, 'public/saloon/merchant.html')));
app.get('/saloon/admin',    (_, res) => res.sendFile(join(__dirname, 'public/saloon/admin.html')));

// ── Wellness module ───────────────────────────────────────────────
app.get('/wellness',          (_, res) => res.sendFile(join(__dirname, 'public/wellness/index.html')));
app.get('/wellness/detail',   (_, res) => res.sendFile(join(__dirname, 'public/wellness/detail.html')));
app.get('/wellness/merchant', (_, res) => res.sendFile(join(__dirname, 'public/wellness/merchant.html')));
app.get('/wellness/admin',    (_, res) => res.sendFile(join(__dirname, 'public/wellness/admin.html')));

// 404 fallback — catches anything not matched above
app.use((req, res) => {
    console.error('[404]', req.method, req.url);
    res.status(404).send(`<h2>404 — ${req.method} ${req.url}</h2><p>Route not matched in server.js</p>`);
});

app.listen(PORT, () => {
    console.log('Kivu running at http://localhost:' + PORT);
});