-- 1. find_user_id_by_email: solo service_role
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO service_role;

-- 2. Funciones de trigger: nadie debería invocarlas vía RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_business() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_business() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_business() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;

-- 3. Política nueva de INSERT en businesses
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;

CREATE POLICY "Authenticated users can create businesses"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND length(trim(name)) > 0
  AND (
    SELECT count(*) FROM public.business_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.role = 'admin'
  ) < 5
);