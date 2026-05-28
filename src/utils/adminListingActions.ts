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
    throw new Error(data?.error || error?.message || "Admin listing action failed.");
  }

  return data;
};
