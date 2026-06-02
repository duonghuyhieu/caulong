"use client";

// Auth context don gian: giu token + thong tin member dang login.
// Token persist o localStorage. Khi mo app, neu co token thi goi /auth/me de khoi phuc phien.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, getToken, setToken } from "./api";
import type { Member } from "./types";

interface AuthState {
  member: Member | null;
  loading: boolean; // dang khoi phuc phien luc mo app
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Khoi phuc phien neu da co token. Khong goi setState dong bo trong than effect:
    // moi nhanh deu ket thuc o .finally (microtask) de tranh cascading render.
    const restore = getToken()
      ? authApi
          .me()
          .then(setMember)
          .catch(() => setToken(null)) // token het han/hong -> xoa
      : Promise.resolve();
    restore.finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const { access_token } = await authApi.login(username, password);
    setToken(access_token);
    const me = await authApi.me();
    setMember(me);
  }

  function logout() {
    setToken(null);
    setMember(null);
  }

  return (
    <AuthContext.Provider value={{ member, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phai dung trong <AuthProvider>");
  return ctx;
}
