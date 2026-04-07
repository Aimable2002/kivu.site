// supabase/functions/swift-worker/index.ts
// ─────────────────────────────────────────────────────────────────────
//  Clinic Admin Edge Function  (pure SPA — no Express server needed)
//  Deploy: supabase functions deploy swift-worker
//
//  Routes:
//    GET  /applications              → list pending applications
//    POST /applications/:id/approve  → approve → insert into clinics + clinic_doctors
//    POST /applications/:id/reject   → mark rejected
//    GET  /clinics                   → list all live clinics
//    POST /clinics/:id/vip           → toggle is_vip
//    POST /clinics/:id/open          → toggle is_open
// ─────────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') ?? 'kivu2024';

const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
    });
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    const pw = req.headers.get('x-admin-password');
    if (pw !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url  = new URL(req.url);
    const path = url.pathname.replace(/^\/swift-worker/, '') || '/';

    // ── GET /applications ──────────────────────────────────────────────────
    if (req.method === 'GET' && path === '/applications') {
        const { data, error } = await supabase
            .from('clinic_applications')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data);
    }

    // ── GET /clinics ───────────────────────────────────────────────────────
    if (req.method === 'GET' && path === '/clinics') {
        const { data, error } = await supabase
            .from('clinics')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data);
    }

    // ── POST /applications/:id/approve ─────────────────────────────────────
    const approveMatch = path.match(/^\/applications\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approveMatch) {
        const id = approveMatch[1];

        const { data: app, error: fetchErr } = await supabase
            .from('clinic_applications')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchErr || !app) return json({ error: fetchErr?.message ?? 'Not found' }, 404);

        // 1. Insert into clinics
        const { data: clinic, error: insertErr } = await supabase
            .from('clinics')
            .insert({
                application_id:  app.id,
                name:            app.name,
                category:        app.category,
                phone:           app.phone,
                description:     app.description,
                hours:           app.hours,
                booking_type:    app.booking_type,
                cover_image_url: app.cover_image_url,
                youtube_url:     app.youtube_url,
                address:         app.address,
                lat:             app.lat,
                lng:             app.lng,
                tags:            app.tags,
                menu_data:       app.menu_data,
            })
            .select('id')
            .single();
        if (insertErr) return json({ error: insertErr.message }, 500);

        // 2. Expand doctors_data JSONB into clinic_doctors rows
        const doctors = (app.doctors_data ?? []) as Array<{
            name: string;
            specialty?: string;
            years_exp?: number;
            schedule?: string;
            photo_url?: string;
        }>;

        if (doctors.length > 0) {
            const doctorRows = doctors
                .filter(d => d.name?.trim())
                .map(d => ({
                    clinic_id: clinic.id,
                    name:      d.name.trim(),
                    specialty: d.specialty || null,
                    years_exp: d.years_exp || null,
                    schedule:  d.schedule  || null,
                    photo_url: d.photo_url || null,
                }));

            if (doctorRows.length > 0) {
                const { error: docErr } = await supabase
                    .from('clinic_doctors')
                    .insert(doctorRows);
                // Non-fatal: log but don't fail the whole approval
                if (docErr) console.error('clinic_doctors insert error:', docErr.message);
            }
        }

        // 3. Mark application approved
        await supabase
            .from('clinic_applications')
            .update({ status: 'approved' })
            .eq('id', id);

        return json({ ok: true });
    }

    // ── POST /applications/:id/reject ──────────────────────────────────────
    const rejectMatch = path.match(/^\/applications\/([^/]+)\/reject$/);
    if (req.method === 'POST' && rejectMatch) {
        const id = rejectMatch[1];
        const { error } = await supabase
            .from('clinic_applications')
            .update({ status: 'rejected' })
            .eq('id', id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
    }

    // ── POST /clinics/:id/vip ──────────────────────────────────────────────
    const vipMatch = path.match(/^\/clinics\/([^/]+)\/vip$/);
    if (req.method === 'POST' && vipMatch) {
        const id = vipMatch[1];
        const { data: c, error: fetchErr } = await supabase
            .from('clinics').select('is_vip').eq('id', id).single();
        if (fetchErr || !c) return json({ error: fetchErr?.message ?? 'Not found' }, 404);

        const is_vip = !c.is_vip;
        const { error } = await supabase.from('clinics').update({ is_vip }).eq('id', id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, is_vip });
    }

    // ── POST /clinics/:id/open ─────────────────────────────────────────────
    const openMatch = path.match(/^\/clinics\/([^/]+)\/open$/);
    if (req.method === 'POST' && openMatch) {
        const id = openMatch[1];
        const { data: c, error: fetchErr } = await supabase
            .from('clinics').select('is_open').eq('id', id).single();
        if (fetchErr || !c) return json({ error: fetchErr?.message ?? 'Not found' }, 404);

        const is_open = !c.is_open;
        const { error } = await supabase.from('clinics').update({ is_open }).eq('id', id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, is_open });
    }

    return json({ error: 'Not found' }, 404);
});