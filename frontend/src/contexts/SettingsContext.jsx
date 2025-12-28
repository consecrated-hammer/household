import { createContext, useContext, useEffect, useState } from "react";

const SettingsContext = createContext(null);

function GetDefaultSetting(key, fallback) {
  if (typeof localStorage === "undefined") {
    return fallback;
  }
  const saved = localStorage.getItem(key);
  if (saved === null) {
    return fallback;
  }
  return saved;
}

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => GetDefaultSetting("theme", "light"));
  const [layoutMode, setLayoutMode] = useState("auto");
  const [navCollapsed, setNavCollapsed] = useState(() => {
    if (typeof localStorage === "undefined") {
      return false;
    }
    return localStorage.getItem("navCollapsed") === "true";
  });
  const [showDecimals, setShowDecimals] = useState(() => {
    const saved = GetDefaultSetting("showDecimals", "true");
    return saved === "true";
  });
  const [defaultSuperRate, setDefaultSuperRate] = useState(() =>
    GetDefaultSetting("defaultSuperRate", "11.5")
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem("navCollapsed", navCollapsed ? "true" : "false");
  }, [navCollapsed]);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem("showDecimals", showDecimals ? "true" : "false");
  }, [showDecimals]);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem("defaultSuperRate", defaultSuperRate);
  }, [defaultSuperRate]);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        layoutMode,
        setLayoutMode,
        navCollapsed,
        setNavCollapsed,
        showDecimals,
        setShowDecimals,
        defaultSuperRate,
        setDefaultSuperRate
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
