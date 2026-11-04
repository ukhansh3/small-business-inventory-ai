import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
const Context = createContext<{ session: Session | null; loading: boolean }>({
  session: null,
  loading: true,
});
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const client = supabase;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        setLoading(false);
      }
    });
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          setSession(error ? null : data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    const refresh = () => {
      if (AppState.currentState === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    refresh();
    const listener = AppState.addEventListener("change", refresh);
    return () => {
      active = false;
      subscription.unsubscribe();
      listener.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);
  return <Context value={{ session, loading }}>{children}</Context>;
}
export const useAuth = () => useContext(Context);
