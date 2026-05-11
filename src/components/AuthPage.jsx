import { startTransition, useState } from "react";
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

export default function AuthPage({ onLogin, onSignup }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(LOGIN_DEFAULTS);
  const [signupForm, setSignupForm] = useState(SIGNUP_DEFAULTS);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

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

                <div className="auth-inline-action">
                  <button
                    className="auth-text-button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setError("");
                      setNotice("");
                      setIsForgotPasswordOpen(true);
                    }}
                    type="button"
                  >
                    Forgot password?
                  </button>
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
              tailored immediately. Returning users can log in directly.
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
