import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Login, Register, Refresh } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [tokens, setTokens] = useState(() => {
    const saved = localStorage.getItem("budgetTokens");
    return saved ? JSON.parse(saved) : null;
  });
  const tokensRef = useRef(tokens);
  const refreshPromiseRef = useRef(null);

  useEffect(() => {
    if (tokens) {
      localStorage.setItem("budgetTokens", JSON.stringify(tokens));
    } else {
      localStorage.removeItem("budgetTokens");
    }
    tokensRef.current = tokens;
  }, [tokens]);

  const RefreshTokens = async () => {
    if (!tokensRef.current?.RefreshToken) {
      throw new Error("Missing refresh token");
    }
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = Refresh(tokensRef.current.RefreshToken)
        .then((newTokens) => {
          setTokens(newTokens);
          return newTokens;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }
    return refreshPromiseRef.current;
  };

  const ExecuteWithRefresh = async (fn) => {
    if (!tokensRef.current?.AccessToken) {
      throw new Error("Missing access token");
    }
    try {
      return await fn(tokensRef.current.AccessToken);
    } catch (error) {
      if (error.status !== 401) {
        throw error;
      }
      const newTokens = await RefreshTokens();
      return await fn(newTokens.AccessToken);
    }
  };

  const login = async (payload) => {
    const result = await Login(payload);
    setTokens(result);
    return result;
  };

  const register = async (payload) => {
    return Register(payload);
  };

  const logout = () => {
    setTokens(null);
  };

  const RequireRole = () => true;

  return (
    <AuthContext.Provider
      value={{
        tokens,
        setTokens,
        login,
        register,
        logout,
        ExecuteWithRefresh,
        RequireRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
