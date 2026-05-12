import { startTransition, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForgotPasswordModal from "./ForgotPasswordModal";

const LOGIN_DEFAULTS = {
  email: "",
  password: "",
};

const SIGNUP_DEFAULTS = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_IMAGE_SRC = "/images/events/google.jpg";
const GOOGLE_SCRIPT_ID = "eventpulse-google-identity";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const AUTH_INLINE_ACTION_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "nowrap",
  gap: "0.85rem",
  width: "100%",
  marginTop: "-0.35rem",
};
const AUTH_TEXT_BUTTON_STYLE = {
  whiteSpace: "nowrap",
  flex: "0 0 auto",
};
const GOOGLE_ICON_SHELL_STYLE = {
  position: "relative",
  width: "50px",
  height: "50px",
  minWidth: "50px",
  minHeight: "50px",
  maxWidth: "50px",
  maxHeight: "50px",
  overflow: "hidden",
  borderRadius: "50%",
  backgroundColor: "#ffffff",
  marginLeft: "auto",
  flex: "0 0 50px",
};
const GOOGLE_ICON_IMAGE_WRAP_STYLE = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  zIndex: 2,
};
const GOOGLE_ICON_IMAGE_STYLE = {
  width: "34px",
  height: "34px",
  display: "block",
  objectFit: "contain",
};
const GOOGLE_NATIVE_BUTTON_STYLE = {
  position: "absolute",
  inset: 0,
  opacity: 0,
  zIndex: 1,
};

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Sign-In is unavailable outside the browser."),
    );
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(window.google), {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Sign-In.")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google Sign-In."));
    document.head.append(script);
  });
}

export default function AuthPage({ onGoogleLogin, onLogin, onSignup }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(LOGIN_DEFAULTS);
  const [signupForm, setSignupForm] = useState(SIGNUP_DEFAULTS);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const googleCallbackRef = useRef(async () => {});
  const isGoogleLoginEnabled = Boolean(GOOGLE_CLIENT_ID && onGoogleLogin);

  useEffect(() => {
    if (!isGoogleLoginEnabled) {
      return undefined;
    }

    let ignore = false;

    void loadGoogleIdentityScript()
      .then((google) => {
        if (ignore || !google?.accounts?.id) {
          return;
        }

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            void googleCallbackRef.current(response);
          },
        });

        setIsGoogleReady(true);
      })
      .catch((loadError) => {
        console.error("Failed to initialize Google Sign-In:", loadError);
      });

    return () => {
      ignore = true;
    };
  }, [isGoogleLoginEnabled]);

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((current) => ({ ...current, [name]: value }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      await onLogin(loginForm);
      startTransition(() => navigate("/"));
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      await onSignup(signupForm);
      setSignupForm(SIGNUP_DEFAULTS);
      startTransition(() => navigate("/"));
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSuccess = (email) => {
    setMode("login");
    setIsForgotPasswordOpen(false);
    setLoginForm((current) => ({
      ...current,
      email,
      password: "",
    }));
    setError("");
    setNotice("Password updated successfully. Log in with your new password.");
  };

  googleCallbackRef.current = async (googleResponse) => {
    const credential = String(googleResponse?.credential || "").trim();

    if (!credential) {
      setError("Google login could not be verified. Please try again.");
      return;
    }

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      await onGoogleLogin({ credential });
      startTransition(() => navigate("/"));
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      mode !== "login" ||
      !isGoogleReady ||
      !googleButtonRef.current ||
      !window.google?.accounts?.id
    ) {
      return;
    }

    const buttonHost = googleButtonRef.current;

    buttonHost.innerHTML = "";
    window.google.accounts.id.renderButton(buttonHost, {
      type: "icon",
      theme: "outline",
      size: "large",
      shape: "circle",
    });
  }, [isGoogleReady, mode]);

  const handleUnavailableGoogleLogin = () => {
    setError("Add VITE_GOOGLE_CLIENT_ID in .env to enable Google login.");
    setNotice("");
  };

  return (
    <>
      <main className="page-shell auth-page">
        <section className="auth-grid fade-up">
          <div className="auth-hero panel">
            <span className="eyebrow">Event discovery built around you</span>
            <h1>Find what is happening around your city before the night decides for you.</h1>
            <p className="lead">
              EventPulse helps users discover movies, comedy shows, concerts,
              sports events, theatre, and city festivals within a 40 km range.
            </p>

            <div className="stat-grid">
              <article className="stat-card">
                <strong>40 km</strong>
                <span>distance-based event discovery</span>
              </article>
              <article className="stat-card">
                <strong>6 categories</strong>
                <span>movies, comedy, sports, concerts, theatre, festivals</span>
              </article>
              <article className="stat-card">
                <strong>Preference-first</strong>
                <span>new users get personalized recommendations immediately</span>
              </article>
            </div>
          </div>

          <div className="auth-card panel">
            <div className="brand-lockup">
              <span className="brand-mark">EP</span>
              <div>
                <p className="eyebrow">Frontend demo</p>
                <h2>EventPulse</h2>
              </div>
            </div>

            <div className="auth-toggle">
              <button
                className={mode === "login" ? "chip is-active" : "chip"}
                onClick={() => {
                  setMode("login");
                  setError("");
                  setNotice("");
                }}
                type="button"
              >
                Login
              </button>
              <button
                className={mode === "signup" ? "chip is-active" : "chip"}
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setNotice("");
                }}
                type="button"
              >
                Signup
              </button>
            </div>

            {mode === "login" ? (
              <form className="form-stack" onSubmit={handleLoginSubmit}>
                <label>
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    disabled={isSubmitting}
                    name="email"
                    onChange={handleLoginChange}
                    placeholder="you@example.com"
                    type="email"
                    value={loginForm.email}
                    required
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    name="password"
                    onChange={handleLoginChange}
                    placeholder="Enter your password"
                    type="password"
                    value={loginForm.password}
                    required
                  />
                </label>

                <div className="auth-inline-action" style={AUTH_INLINE_ACTION_STYLE}>
                  <button
                    className="auth-text-button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setError("");
                      setNotice("");
                      setIsForgotPasswordOpen(true);
                    }}
                    style={AUTH_TEXT_BUTTON_STYLE}
                    type="button"
                  >
                    Forgot password?
                  </button>

                  {isGoogleLoginEnabled ? (
                    <div
                      aria-busy={isSubmitting}
                      className={
                        isSubmitting
                          ? "auth-google-inline auth-google-inline--disabled"
                          : "auth-google-inline"
                      }
                      style={GOOGLE_ICON_SHELL_STYLE}
                      title="Continue with Google"
                    >
                      <span
                        aria-hidden="true"
                        className="auth-google-visual"
                        style={GOOGLE_ICON_IMAGE_WRAP_STYLE}
                      >
                        <img
                          alt=""
                          className="auth-google-image"
                          src={GOOGLE_IMAGE_SRC}
                          style={GOOGLE_ICON_IMAGE_STYLE}
                        />
                      </span>

                      <div
                        aria-label="Continue with Google"
                        className="auth-google-button auth-google-button--icon"
                        ref={googleButtonRef}
                        style={GOOGLE_NATIVE_BUTTON_STYLE}
                      />
                    </div>
                  ) : (
                    <button
                      aria-label="Continue with Google"
                      className="auth-google-fallback"
                      disabled={isSubmitting}
                      onClick={handleUnavailableGoogleLogin}
                      style={GOOGLE_ICON_SHELL_STYLE}
                      title="Continue with Google"
                      type="button"
                    >
                      <span aria-hidden="true" style={GOOGLE_ICON_IMAGE_WRAP_STYLE}>
                        <img
                          alt=""
                          className="auth-google-image"
                          src={GOOGLE_IMAGE_SRC}
                          style={GOOGLE_ICON_IMAGE_STYLE}
                        />
                      </span>
                    </button>
                  )}
                </div>

                <button className="button button--primary" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Logging in..." : "Login to dashboard"}
                </button>
              </form>
            ) : (
              <form className="form-stack" onSubmit={handleSignupSubmit}>
                <label>
                  <span>Full name</span>
                  <input
                    autoComplete="name"
                    disabled={isSubmitting}
                    name="name"
                    onChange={handleSignupChange}
                    placeholder="Your name"
                    type="text"
                    value={signupForm.name}
                    required
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    disabled={isSubmitting}
                    name="email"
                    onChange={handleSignupChange}
                    placeholder="you@example.com"
                    type="email"
                    value={signupForm.email}
                    required
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    name="password"
                    onChange={handleSignupChange}
                    placeholder="Create a password"
                    type="password"
                    value={signupForm.password}
                    required
                  />
                </label>
                <label>
                  <span>Confirm password</span>
                  <input
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    name="confirmPassword"
                    onChange={handleSignupChange}
                    placeholder="Repeat the password"
                    type="password"
                    value={signupForm.confirmPassword}
                    required
                  />
                </label>
                <button className="button button--primary" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}

            {notice ? <p className="message message--success">{notice}</p> : null}
            {error ? <p className="message message--error">{error}</p> : null}

            <p className="supporting-text">
              First-time signup opens a preference popup so the dashboard can be
              tailored immediately. Returning users can log in directly or continue with Google when the email matches.
            </p>

            <div className="auth-admin-panel">
              <p className="eyebrow auth-admin-panel__title">Platform Moderation</p>
              <button
                className="button button--secondary auth-admin-panel__button"
                onClick={() => navigate("/admin/login")}
                type="button"
              >
                Admin Login
              </button>
            </div>
          </div>
        </section>
      </main>

      <ForgotPasswordModal
        initialEmail={loginForm.email}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccess={handleForgotPasswordSuccess}
        open={isForgotPasswordOpen}
      />
    </>
  );
}
