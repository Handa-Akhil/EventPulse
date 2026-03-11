import { useEffect, useState } from "react";
import { PREFERENCE_OPTIONS } from "../data/preferences";

export default function PreferenceModal({
  open,
  initialSelected,
  onSave,
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setSelected(initialSelected);
    setIsSaving(false);
    setSaveError("");
  }, [initialSelected, open]);

  if (!open) {
    return null;
  }

  const toggleSelection = (value) => {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError("");

    try {
      await onSave(selected);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card panel fade-up">
        <span className="eyebrow">One-time onboarding</span>
        <h2>Choose what you want to see first.</h2>
        <p className="lead">
          These preferences shape the dashboard after signup. You can pick more
          than one category.
        </p>

        <div className="choice-grid">
          {PREFERENCE_OPTIONS.map((option) => {
            const active = selected.includes(option.value);

            return (
              <button
                className={active ? "choice-tile is-active" : "choice-tile"}
                disabled={isSaving}
                key={option.value}
                onClick={() => toggleSelection(option.value)}
                type="button"
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            );
          })}
        </div>

        <div className="modal-actions">
          <p className="supporting-text">
            Select at least one preference to continue.
          </p>
          <button
            className="button button--primary"
            disabled={selected.length === 0 || isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Save preferences"}
          </button>
        </div>

        {saveError ? <p className="message message--error">{saveError}</p> : null}
      </div>
    </div>
  );
}
