import express           from 'express';
import { join }          from 'path';
import { fileURLToPath } from 'url';
import { dirname }       from 'path';
import { createClient }  from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

// Single service-role client used by all admin routes
const admin = createClient(
    process.env.SUPABASE_URL || 'https://zujnupfixfexwqedfgpn.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1am51cGZpeGZleHdxZWRmZ3BuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NjM2NCwiZXhwIjoyMDg4ODMyMzY0fQ._YbGO6EoOyKxVG1v6HStB1viTvCO71yrBoLcwnQOsvs"
);
app.use(express.json());

// JS modules — scoped to /js so static never intercepts page routes
app.use('/js', express.static(join(__dirname, 'public/js')));

// ── FOOD ADMIN API ────────────────────────────────────────────────
app.get('/api/admin/applications', async (req, res) => {
    const { data, error } = await admin
        .from('merchant_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/applications/:id/approve', async (req, res) => {
    const { error } = await admin.from('merchant_applications').update({ status: 'approved' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/applications/:id/reject', async (req, res) => {
    const { error } = await admin.from('merchant_applications').update({ status: 'rejected' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.get('/api/admin/restaurants', async (req, res) => {
    const { data, error } = await admin
        .from('restaurants')
        .select('id, name, category, address, phone, is_vip, is_open, status, created_at')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/restaurants/:id/vip', async (req, res) => {
    const { error } = await admin.from('restaurants').update({ is_vip: req.body.is_vip }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/restaurants/:id/open', async (req, res) => {
    const { error } = await admin.from('restaurants').update({ is_open: req.body.is_open }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

// ── SALOON ADMIN API ──────────────────────────────────────────────
app.get('/api/admin/saloon-applications', async (req, res) => {
    const { data, error } = await admin.from('saloon_applications').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/saloon-applications/:id/approve', async (req, res) => {
    const { error } = await admin.from('saloon_applications').update({ status: 'approved' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/saloon-applications/:id/reject', async (req, res) => {
    const { error } = await admin.from('saloon_applications').update({ status: 'rejected' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.get('/api/admin/saloons', async (req, res) => {
    const { data, error } = await admin.from('saloons').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/saloons/:id/vip', async (req, res) => {
    const { error } = await admin.from('saloons').update({ is_vip: req.body.is_vip }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/saloons/:id/open', async (req, res) => {
    const { error } = await admin.from('saloons').update({ is_open: req.body.is_open }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

// ── WELLNESS ADMIN API ────────────────────────────────────────────
app.get('/api/admin/wellness-applications', async (req, res) => {
    const { data, error } = await admin.from('wellness_applications').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/wellness-applications/:id/approve', async (req, res) => {
    const { error } = await admin.from('wellness_applications').update({ status: 'approved' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/wellness-applications/:id/reject', async (req, res) => {
    const { error } = await admin.from('wellness_applications').update({ status: 'rejected' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.get('/api/admin/wellness-centers', async (req, res) => {
    const { data, error } = await admin.from('wellness_centers').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/wellness-centers/:id/vip', async (req, res) => {
    const { error } = await admin.from('wellness_centers').update({ is_vip: req.body.is_vip }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/wellness-centers/:id/open', async (req, res) => {
    const { error } = await admin.from('wellness_centers').update({ is_open: req.body.is_open }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

// ── FUNERAL ADMIN API ─────────────────────────────────────────────
app.get('/api/admin/funeral-applications', async (req, res) => {
    const { data, error } = await admin.from('funeral_applications').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/funeral-applications/:id/approve', async (req, res) => {
    const { error } = await admin.from('funeral_applications').update({ status: 'approved' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/funeral-applications/:id/reject', async (req, res) => {
    const { error } = await admin.from('funeral_applications').update({ status: 'rejected' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.get('/api/admin/funeral-providers', async (req, res) => {
    const { data, error } = await admin.from('funeral_providers').select('*').eq('status', 'approved').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.post('/api/admin/funeral-providers/:id/vip', async (req, res) => {
    const { error } = await admin.from('funeral_providers').update({ is_vip: req.body.is_vip }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
app.post('/api/admin/funeral-providers/:id/open', async (req, res) => {
    const { error } = await admin.from('funeral_providers').update({ is_open: req.body.is_open }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

// ── PAGE ROUTES ───────────────────────────────────────────────────
app.get('/',                  (_, res) => res.sendFile(join(__dirname, 'public/index.html')));

// Food
app.get('/food',              (_, res) => res.sendFile(join(__dirname, 'public/food/index.html')));
app.get('/food/restaurant',   (_, res) => res.sendFile(join(__dirname, 'public/food/restaurant.html')));
app.get('/food/merchant',     (_, res) => res.sendFile(join(__dirname, 'public/food/merchant.html')));
app.get('/food/admin',        (_, res) => res.sendFile(join(__dirname, 'public/food/admin.html')));

// Saloon
app.get('/saloon',            (_, res) => res.sendFile(join(__dirname, 'public/saloon/index.html')));
app.get('/saloon/detail',     (_, res) => res.sendFile(join(__dirname, 'public/saloon/detail.html')));
app.get('/saloon/merchant',   (_, res) => res.sendFile(join(__dirname, 'public/saloon/merchant.html')));
app.get('/saloon/admin',      (_, res) => res.sendFile(join(__dirname, 'public/saloon/admin.html')));

// Wellness
app.get('/wellness',          (_, res) => res.sendFile(join(__dirname, 'public/wellness/index.html')));
app.get('/wellness/detail',   (_, res) => res.sendFile(join(__dirname, 'public/wellness/detail.html')));
app.get('/wellness/merchant', (_, res) => res.sendFile(join(__dirname, 'public/wellness/merchant.html')));
app.get('/wellness/admin',    (_, res) => res.sendFile(join(__dirname, 'public/wellness/admin.html')));

// Funeral
app.get('/funeral',           (_, res) => res.sendFile(join(__dirname, 'public/funeral/index.html')));
app.get('/funeral/detail',    (_, res) => res.sendFile(join(__dirname, 'public/funeral/detail.html')));
app.get('/funeral/merchant',  (_, res) => res.sendFile(join(__dirname, 'public/funeral/merchant.html')));
app.get('/funeral/admin',     (_, res) => res.sendFile(join(__dirname, 'public/funeral/admin.html')));

// Academy
app.get('/academy',           (_, res) => res.sendFile(join(__dirname, 'public/academy/index.html')));
app.get('/academy/admin',     (_, res) => res.sendFile(join(__dirname, 'public/academy/admin.html')));

// 404 fallback
app.use((req, res) => {
    console.error('[404]', req.method, req.url);
    res.status(404).send(`<h2>404 — ${req.method} ${req.url}</h2><p>Route not matched in server.js</p>`);
});

app.listen(PORT, () => {
    console.log(`Kivu running at http://localhost:${PORT}`);
});