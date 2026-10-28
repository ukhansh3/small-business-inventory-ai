import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { createSessionStorage } from "./session-storage";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
// Only publishable keys are accepted; never silently bundle a server secret here.
const validKey =
  !!key &&
  (key.startsWith("sb_publishable_") ||
    (() => {
      try {
        return (
          JSON.parse(
            atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
          ).role === "anon"
        );
      } catch {
        return false;
      }
    })());
export const supabase =
  url && url.startsWith("https://") && validKey
    ? createClient(url, key!, {
        auth: {
          storage: createSessionStorage(SecureStore),
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
export const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "")
  .trim()
  .replace(/\/$/, "");
export const backendConfigured =
  !!supabase &&
  (/^https:\/\//.test(apiBase) || (__DEV__ && /^http:\/\//.test(apiBase)));
