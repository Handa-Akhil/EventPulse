import { useEffect, useRef, useState } from "react";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from "../services/api";

const INITIAL_FORM = {
  email: "",
  otp: "",
  password: "",
  confirmPassword: "",
};

export default function ForgotPasswordModal({
  open,
  initialEmail,
  onClose,
  onSuccess,
}) {
  const [step, setStep] = useState("request");
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordMismatchPopup, setShowPasswordMismatchPopup] = useState(false);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("request");
    setForm({
      ...INITIAL_FORM,
      email: initialEmail || "",
    });
    setError("");
    setMessage("");
    setIsSubmitting(false);
    setShowPasswordMismatchPopup(false);
  }, [initialEmail, open]);

  useEffect(() => {
    if (!open || step !== "success") {
      return undefined;
    }

    const redirectTimer = window.setTimeout(() => {
      onSuccess(form.email);
    }, 1800);

    return () => {
      window.clearTimeout(redirectTimer);
    };
  }, [form.email, onSuccess, open, step]);

  if (!open) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleClosePasswordMismatchPopup = () => {
    setShowPasswordMismatchPopup(false);
    window.setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 0);
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await requestPasswordResetOtp(form.email);
      setMessage(response.message);
      setStep("verify");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await verifyPasswordResetOtp(form.email, form.otp);
      setMessage(response.message);
      setStep("reset");
    } catch (verifyError) {
      setError(verifyError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
      setShowPasswordMismatchPopup(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPasswordWithOtp(form);
      setMessage(response.message);
      setStep("success");
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const renderStepContent = () => {
    if (step === "request") {
      return (
        <form className="form-stack" onSubmit={handleRequestSubmit}>
          <label>
            <span>Registered email</span>
            <input
              autoComplete="email"
              disabled={isSubmitting}
              name="email"
              onChange={handleChange}
              placeholder="you@example.com"
              type="email"
              value={form.email}
              required
            />
          </label>

          <p className="supporting-text">
            Enter your registered email address and we will send a numeric OTP
            to reset your password.
          </p>

          <div className="modal-actions">
            <button
              className="button button--ghost"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Sending OTP..." : "Send OTP"}
            </button>
          </div>
        </form>
      );
    }

    if (step === "verify") {
      return (
        <form className="form-stack" onSubmit={handleVerifySubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              disabled={isSubmitting}
              name="email"
              onChange={handleChange}
              type="email"
              value={form.email}
              required
            />
          </label>

          <label>
            <span>OTP</span>
            <input
              autoComplete="one-time-code"
              disabled={isSubmitting}
              inputMode="numeric"
              maxLength={6}
              name="otp"
              onChange={handleChange}
              placeholder="Enter the 6-digit OTP"
              type="text"
              value={form.otp}
              required
            />
          </label>

          <p className="supporting-text">
            Please enter your OTP to reset your password. The code was sent to
            your registered email address.
          </p>

          <div className="modal-actions">
            <button
              className="button button--ghost"
              disabled={isSubmitting}
              onClick={() => {
                setStep("request");
                setError("");
                setMessage("");
              }}
              type="button"
            >
              Resend OTP
            </button>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </form>
      );
    }

    if (step === "reset") {
      return (
        <form className="form-stack" onSubmit={handleResetSubmit}>
          <label>
            <span>New password</span>
            <input
              autoComplete="new-password"
              disabled={isSubmitting}
              name="password"
              onChange={handleChange}
              placeholder="Enter a new password"
              ref={passwordInputRef}
              type="password"
              value={form.password}
              required
            />
          </label>

          <label>
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              disabled={isSubmitting}
              name="confirmPassword"
              onChange={handleChange}
              placeholder="Confirm the new password"
              type="password"
              value={form.confirmPassword}
              required
            />
          </label>

          <p className="supporting-text">
            OTP verified. Enter a new password and confirm it to update your
            account password.
          </p>

          <div className="modal-actions">
            <button
              className="button button--ghost"
              disabled={isSubmitting}
              onClick={() => {
                setStep("verify");
                setError("");
                setMessage("");
              }}
              type="button"
            >
              Back
            </button>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Updating password..." : "Update password"}
            </button>
          </div>
        </form>
      );
    }

    return (
      <div className="forgot-password-modal__success">
        <div className="forgot-password-modal__success-badge">Success</div>
        <p className="supporting-text">
          Your password has been changed successfully. Redirecting to the login
          page.
        </p>

        <div className="modal-actions">
          <button className="button button--primary" onClick={() => onSuccess(form.email)} type="button">
            Go to login now
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal-card panel fade-up forgot-password-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div className="forgot-password-modal__header">
            <span className="eyebrow">Account recovery</span>
            <h2>Forgot password</h2>
            <p className="lead">
              {step === "request" && "Request an OTP to reset your password."}
              {step === "verify" && "Check your email and enter the OTP."}
              {step === "reset" && "Create a new password for your account."}
              {step === "success" && "Password reset completed successfully."}
            </p>
          </div>

          <button
            aria-label="Close forgot password dialog"
            className="button button--ghost forgot-password-modal__close"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {message ? <p className="message message--success">{message}</p> : null}
        {error ? <p className="message message--error">{error}</p> : null}

        {renderStepContent()}

        {showPasswordMismatchPopup ? (
          <div className="forgot-password-modal__alert-backdrop">
            <div className="forgot-password-modal__alert-card">
              <div className="forgot-password-modal__alert-badge">Password mismatch</div>
              <p className="supporting-text">
                New password and confirm password are not the same. Please enter
                both passwords again.
              </p>

              <div className="modal-actions">
                <button
                  className="button button--primary"
                  onClick={handleClosePasswordMismatchPopup}
                  type="button"
                >
                  Re-enter password
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
