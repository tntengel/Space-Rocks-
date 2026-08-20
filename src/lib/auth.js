import { supabase } from "./supabaseClient";

// Passwordless sign-up/sign-in: Supabase emails a magic link. Name and
// birthdate ride along as auth user metadata so the `handle_new_user`
// database trigger (see supabase/migrations/0001_init_schema.sql) can
// create the matching public.users + public.channels rows — including
// the server-side 13+ age check — the moment the auth user is created.
export async function signUpWithEmail({ name, email, birthdate }) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
      data: { name, birthdate },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function loadUserProfile(authUserId) {
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, name, handle, email, is_adult, channel_id")
    .eq("id", authUserId)
    .single();
  if (error) throw error;

  const [{ data: following }, { data: notifications }] = await Promise.all([
    supabase.from("follows").select("channel_id").eq("follower_user_id", authUserId),
    supabase
      .from("notifications")
      .select("id, text, read, created_at")
      .eq("user_id", authUserId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    name: profile.name,
    handle: profile.handle,
    email: profile.email,
    channelId: profile.channel_id,
    isAdult: profile.is_adult,
    following: (following || []).map((f) => f.channel_id),
    notifications: (notifications || []).map((n) => ({
      id: n.id,
      text: n.text,
      read: n.read,
      time: n.created_at,
    })),
  };
}

// Fires immediately with the current session (if any), then again on
// every sign-in/sign-out/token refresh. Returns an unsubscribe function.
export function subscribeToAuthChanges(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}
