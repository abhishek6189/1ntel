export const getFunctionErrorMessage = async (error: any, fallback = "Request failed.") => {
  const context = error?.context;

  try {
    if (context?.json) {
      const body = await context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
  } catch {
    // Fall back to the Supabase client message below.
  }

  return String(error?.message || fallback);
};
