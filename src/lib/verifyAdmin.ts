import { createClient } from '@/lib/supabaseServer';

export async function verifyAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return {
      authorized: false,
      user: null,
    };
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || user.email.toLowerCase() !== adminEmail) {
    return {
      authorized: false,
      user: null,
    };
  }

  return {
    authorized: true,
    user,
  };
}