import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { icons } from "../components/icons.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useSettings } from "../contexts/SettingsContext.jsx";

const navItems = [
  { label: "Home", icon: "dashboard", path: "/", end: true },
  { label: "Income", icon: "income", path: "/income" },
  { label: "Expenses", icon: "expenses", path: "/expenses" },
  { label: "Allocations", icon: "allocations", path: "/allocations" },
  { label: "Settings", icon: "settings", path: "/settings" }
];

const incomeSubItems = [
  { label: "Add income stream", icon: "plus", hash: "add-income" },
  { label: "Salary calculator", icon: "calculator", hash: "calculator" },
  { label: "What-if analysis", icon: "allocations", hash: "what-if" }
];

export function AppLayout() {
  const { tokens, logout } = useAuth();
  const { layoutMode, navCollapsed, setNavCollapsed, theme, setTheme } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [incomeNavOpen, setIncomeNavOpen] = useState(false);
  const [isCompactAuto, setIsCompactAuto] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      setIsCompactAuto(window.innerWidth <= 1024);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    setIncomeNavOpen(false);
  }, [location.pathname]);

  const isCompact = layoutMode === "auto" ? isCompactAuto : layoutMode === "compact";

  const pageTitle = useMemo(() => {
    if (location.pathname === "/") {
      return "Household";
    }
    if (location.pathname.startsWith("/expenses")) {
      return "Expenses";
    }
    if (location.pathname.startsWith("/allocations")) {
      return "Allocations";
    }
    if (location.pathname.startsWith("/settings")) {
      return "Settings";
    }
    return "Income";
  }, [location.pathname]);

  if (!tokens?.AccessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-sand px-4 py-6 text-ink dark:bg-[#0f0e0c] dark:text-sand">
      <div className="mx-auto flex w-full max-w-[1840px] gap-6">
        {!isCompact ? (
          <aside
            className={`sticky top-6 z-40 hidden h-[calc(100vh-3rem)] flex-col justify-between rounded-3xl bg-ink px-4 py-6 text-sand shadow-glow lg:flex overflow-visible ${
              navCollapsed ? "w-20" : "w-64"
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-sand/60">
                  <span className="inline-flex h-5 w-5 items-center justify-center text-sand/80">
                    {icons.household}
                  </span>
                  {!navCollapsed ? "Household" : null}
                </div>
              </div>
              <div className="space-y-3">
                {navItems.map((item) => (
                  <div key={item.label} className="relative">
                    <NavLink
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        `w-full rounded-2xl px-4 py-3 text-left text-sm flex items-center justify-between gap-3 ${
                          isActive
                            ? "bg-sand/10 text-sand"
                            : "text-sand/60 hover:text-sand"
                        } ${item.enabled === false ? "cursor-not-allowed opacity-60" : ""}`
                      }
                      onClick={(event) => {
                        if (item.enabled === false) {
                          event.preventDefault();
                          return;
                        }
                        if (item.label === "Income") {
                          setIncomeNavOpen((current) => !current);
                        } else {
                          setIncomeNavOpen(false);
                        }
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-sand/80">{icons[item.icon]}</span>
                        {!navCollapsed ? item.label : null}
                      </span>
                      {item.label === "Income" && !navCollapsed ? (
                        <span className="text-sand/60">
                          {incomeNavOpen ? icons.chevronDown : icons.chevron}
                        </span>
                      ) : null}
                    </NavLink>
                    {item.label === "Income" && incomeNavOpen ? (
                      <div className="absolute left-full top-0 z-50 ml-3 w-56 rounded-2xl border border-sand/10 bg-ink/95 p-3 text-sand shadow-xl">
                        {incomeSubItems.map((entry) => (
                          <button
                            key={entry.label}
                            type="button"
                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-sand/80 hover:bg-sand/10"
                            onClick={() => {
                              navigate(`/income#${entry.hash}`);
                              setIncomeNavOpen(false);
                            }}
                          >
                            <span className="flex items-center gap-2">
                              {icons[entry.icon]}
                              {entry.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {item.enabled === false && !navCollapsed ? (
                      <span className="mt-1 block text-xs text-sand/40">(coming soon!)</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                <span className="flex items-center gap-3">
                  <span className="text-sand/80">{theme === "light" ? icons.moon : icons.sun}</span>
                  {!navCollapsed ? "Toggle theme" : null}
                </span>
              </button>
              <button
                type="button"
                className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                onClick={logout}
              >
                <span className="flex items-center gap-3">
                  <span className="text-sand/80">{icons.logout}</span>
                  {!navCollapsed ? "Sign out" : null}
                </span>
              </button>
              <button
                type="button"
                className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70 hover:bg-sand/10"
                onClick={() => setNavCollapsed((current) => !current)}
                aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
              >
                <span className="flex items-center gap-3">
                  <span className="text-sand/80">
                    {navCollapsed ? icons.expand : icons.collapse}
                  </span>
                  {!navCollapsed ? "Collapse" : null}
                </span>
              </button>
            </div>
          </aside>
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {isCompact ? (
                <button
                  type="button"
                  className="rounded-full border border-ink/20 bg-white px-4 py-2 text-sm"
                  onClick={() => setNavOpen(true)}
                >
                  Menu
                </button>
              ) : null}
              <h2 className="font-display text-2xl">{pageTitle}</h2>
            </div>
          </div>

          <Outlet />
        </section>
      </div>

      {isCompact ? (
        <div
          className={`fixed inset-0 z-40 transition ${
            navOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
          <aside className="relative h-full w-72 bg-ink px-6 py-6 text-sand shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-sand/60">
                <span className="inline-flex h-5 w-5 items-center justify-center text-sand/80">
                  {icons.household}
                </span>
                Household
              </div>
              <button
                type="button"
                className="rounded-full border border-sand/30 px-2 py-1 text-xs"
                onClick={() => setNavOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `w-full rounded-2xl px-4 py-3 text-left text-sm flex items-center justify-between gap-3 ${
                      isActive
                        ? "bg-sand/10 text-sand"
                        : "text-sand/60 hover:text-sand"
                    } ${item.enabled === false ? "cursor-not-allowed opacity-60" : ""}`
                  }
                  onClick={(event) => {
                    if (item.enabled === false) {
                      event.preventDefault();
                      return;
                    }
                    if (item.label === "Income") {
                      setIncomeNavOpen((current) => !current);
                    } else {
                      setIncomeNavOpen(false);
                    }
                    setNavOpen(false);
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-sand/80">{icons[item.icon]}</span>
                    {item.label}
                  </span>
                  {item.label === "Income" ? (
                    <span className="text-sand/60">
                      {incomeNavOpen ? icons.chevronDown : icons.chevron}
                    </span>
                  ) : null}
                </NavLink>
              ))}
              {incomeNavOpen ? (
                <div className="space-y-2">
                  {incomeSubItems.map((entry) => (
                    <button
                      key={entry.label}
                      type="button"
                      className="w-full rounded-2xl border border-sand/10 px-4 py-2 text-left text-xs text-sand/70"
                      onClick={() => {
                        navigate(`/income#${entry.hash}`);
                        setIncomeNavOpen(false);
                        setNavOpen(false);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {icons[entry.icon]}
                        {entry.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                <span className="flex items-center gap-3">
                  <span className="text-sand/80">{theme === "light" ? icons.moon : icons.sun}</span>
                  Toggle theme
                </span>
              </button>
              <button
                type="button"
                className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                onClick={logout}
              >
                <span className="flex items-center gap-3">
                  <span className="text-sand/80">{icons.logout}</span>
                  Sign out
                </span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
