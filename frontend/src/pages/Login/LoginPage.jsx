import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { GetApiUrl } from "../../lib/api.js";

const InitialAuthForm = {
  Email: "",
  Password: "",
  HouseholdName: ""
};

export function LoginPage() {
  const { login, loginWithAuthelia, register, tokens } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(InitialAuthForm);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "idle", message: "" });
    try {
      if (authMode === "register") {
        await register(authForm);
        setAuthMode("login");
        setStatus({ type: "success", message: "Account created. Sign in next." });
      } else {
        await login({ Email: authForm.Email, Password: authForm.Password });
        navigate("/", { replace: true });
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (tokens?.AccessToken) {
      navigate("/", { replace: true });
      return;
    }
    loginWithAuthelia()
      .then(() => {
        if (active) {
          navigate("/", { replace: true });
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        if (error.status === 401 || error.status === 404) {
          return;
        }
        setStatus({ type: "error", message: error.message });
      });
    return () => {
      active = false;
    };
  }, [loginWithAuthelia, navigate, tokens]);

  const handleAutheliaLogin = async () => {
    setLoading(true);
    setStatus({ type: "idle", message: "" });
    try {
      window.location.href = `${GetApiUrl()}/auth/authelia?returnTo=${encodeURIComponent(
        "/"
      )}`;
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand px-6 py-10 text-ink">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Household</p>
          <h1 className="mt-3 font-display text-4xl">
            Map every income stream and keep the household aligned.
          </h1>
          <p className="mt-3 text-sm text-ink/60">
            Sign in, add household income, and track shared totals in one place.
          </p>
        </div>
        <section className="rounded-3xl border border-ink/10 bg-white/90 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-ink/50">Access</p>
              <h2 className="font-display text-2xl">Secure sign in</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <button
              type="button"
              className="w-full rounded-xl border border-ink/20 px-4 py-3 text-sm font-semibold"
              onClick={handleAutheliaLogin}
              disabled={loading}
            >
              Continue with Authelia
            </button>
            <div className="flex items-center gap-3 text-xs text-ink/50">
              <span className="h-px flex-1 bg-ink/10" />
              Or use email and password
              <span className="h-px flex-1 bg-ink/10" />
            </div>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-full px-4 py-2 text-sm ${
                  authMode === "login" ? "bg-moss text-white" : "border border-ink/20"
                }`}
                onClick={() => setAuthMode("login")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`flex-1 rounded-full px-4 py-2 text-sm ${
                  authMode === "register" ? "bg-moss text-white" : "border border-ink/20"
                }`}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>
            <label className="block text-sm">
              Email
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                value={authForm.Email}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, Email: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                type="password"
                name="password"
                autoComplete={authMode === "register" ? "new-password" : "current-password"}
                required
                value={authForm.Password}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, Password: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
              />
            </label>
            {authMode === "register" ? (
              <label className="block text-sm">
                Household name
                <input
                  type="text"
                  name="household"
                  autoComplete="organization"
                  required
                  value={authForm.HouseholdName}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, HouseholdName: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
                />
              </label>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white"
              disabled={loading}
            >
              {authMode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>

          {status.message ? (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                status.type === "error" ? "bg-ember/10 text-ember" : "bg-moss/10 text-moss"
              }`}
            >
              {status.message}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
