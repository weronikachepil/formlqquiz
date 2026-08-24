import { createContext, useCallback, useContext, useState } from "react";

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [state, setState] = useState(null);

  const open = useCallback((mode, opts = {}) => {
    setState({ mode, redirect: opts.redirect ?? null, email: opts.email ?? "" });
  }, []);
  const openLogin = useCallback((opts) => open("login", opts), [open]);
  const openRegister = useCallback((opts) => open("register", opts), [open]);
  const switchMode = useCallback((mode) => setState((s) => (s ? { ...s, mode } : s)), []);
  const close = useCallback(() => setState(null), []);

  return (
    <AuthModalContext.Provider value={{ state, openLogin, openRegister, switchMode, close }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
