-- ── TRIGGERS ──────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_funeral_approval ON public.funeral_applications;
CREATE TRIGGER on_funeral_approval
    AFTER UPDATE ON public.funeral_applications
    FOR EACH ROW EXECUTE FUNCTION handle_funeral_approval();

DROP TRIGGER IF EXISTS on_merchant_approval ON public.merchant_applications;
CREATE TRIGGER on_merchant_approval
    AFTER UPDATE OF status ON public.merchant_applications
    FOR EACH ROW EXECUTE FUNCTION handle_merchant_approval();

DROP TRIGGER IF EXISTS on_saloon_approval ON public.saloon_applications;
CREATE TRIGGER on_saloon_approval
    AFTER UPDATE OF status ON public.saloon_applications
    FOR EACH ROW EXECUTE FUNCTION handle_saloon_approval();

DROP TRIGGER IF EXISTS on_wellness_approval ON public.wellness_applications;
CREATE TRIGGER on_wellness_approval
    AFTER UPDATE OF status ON public.wellness_applications
    FOR EACH ROW EXECUTE FUNCTION handle_wellness_approval();