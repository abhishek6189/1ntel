import { supabase } from "@/integrations/supabase/client";

export const runAdminListingAction = async (
  action: string,
  carId: string,
  value?: unknown
) => {
  const { data, error } = await supabase.functions.invoke("admin-listing-actions", {
    body: { action, carId, value },
  });

  if (error || data?.error) {
    let message = data?.error || error?.message || "Admin listing action failed.";

    try {
      const context = (error as any)?.context;
      const body = typeof context?.json === "function" ? await context.json() : null;
      message = body?.error || message;
    } catch {}

    throw new Error(message);
  }

  return data;
};
