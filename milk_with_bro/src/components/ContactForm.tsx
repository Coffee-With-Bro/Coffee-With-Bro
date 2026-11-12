import { useState } from "react";
import { navigate } from "../lib/useRoute";
import { trackEvent } from "../lib/analytics";

const TEAM_EMAIL = "ka9812204392@gmail.com";

type Field = "name" | "email" | "subject" | "message";
type Values = Record<Field, string>;
type Touched = Partial<Record<Field, boolean>>;

const EMPTY: Values = { name: "", email: "", subject: "", message: "" };

function validate(values: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};

  if (!values.name.trim()) {
    errors.name = "Please enter your full name.";
  } else if (values.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Please enter your email address so we can reply.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Please enter a valid email address (e.g., name@domain.com).";
  }

  if (!values.subject.trim()) {
    errors.subject = "Please enter a subject line for your message.";
  } else if (values.subject.trim().length < 3) {
    errors.subject = "Subject must be at least 3 characters.";
  }

  if (!values.message.trim()) {
    errors.message = "Please write a message.";
  } else if (values.message.trim().length < 10) {
    errors.message = `Please enter at least 10 characters (currently ${values.message.trim().length}).`;
  }

  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Touched>({});
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submittedAttempt, setSubmittedAttempt] = useState(false);

  function update(field: Field, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    
    if (submittedAttempt || touched[field]) {
      const fieldErrors = validate(nextValues);
      setErrors((prev) => ({
        ...prev,
        [field]: fieldErrors[field],
      }));
    }
  }

  function handleBlur(field: Field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentErrors = validate(values);
    if (currentErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: currentErrors[field] }));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedAttempt(true);

    const found = validate(values);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      trackEvent("contact_form_error", { errorCount: Object.keys(found).length });
      const firstInvalid = (["name", "email", "subject", "message"] as Field[]).find(
        (field) => found[field],
      );
      if (firstInvalid) document.getElementById(firstInvalid)?.focus();
      return;
    }

    trackEvent("contact_form_submit", { subject: values.subject.trim() });

    const body = `${values.message.trim()}\n\n- ${values.name.trim()} (${values.email.trim()})`;
    const href =
      `mailto:${TEAM_EMAIL}` +
      `?subject=${encodeURIComponent(values.subject.trim())}` +
      `&body=${encodeURIComponent(body)}`;

    
    window.location.href = href;

    
    setTimeout(() => {
      navigate("/thank-you");
    }, 400);
  }

  function fieldProps(field: Field) {
    const hasErr = Boolean(errors[field]);
    return {
      id: field,
      name: field,
      value: values[field],
      "aria-invalid": hasErr ? (true as const) : undefined,
      "aria-describedby": hasErr ? `${field}-error` : undefined,
      className: `field-input ${hasErr ? "has-error" : ""}`,
      onBlur: () => handleBlur(field),
    };
  }

  const hasFormErrors = submittedAttempt && Object.keys(errors).some((k) => Boolean(errors[k as Field]));

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {hasFormErrors && (
        <div className="form-error-summary" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <span>Please fix the highlighted errors before sending your message.</span>
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="name">
            Name <span className="required-star" aria-hidden="true">*</span>
          </label>
          <input
            {...fieldProps("name")}
            type="text"
            autoComplete="name"
            placeholder="Your name"
            onChange={(e) => update("name", e.target.value)}
          />
          {errors.name && (
            <p className="field-error" id="name-error" role="alert">
              ⚠️ {errors.name}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">
            Email <span className="required-star" aria-hidden="true">*</span>
          </label>
          <input
            {...fieldProps("email")}
            type="email"
            autoComplete="email"
            placeholder="you@domain.com"
            onChange={(e) => update("email", e.target.value)}
          />
          {errors.email && (
            <p className="field-error" id="email-error" role="alert">
              ⚠️ {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="subject">
          Subject <span className="required-star" aria-hidden="true">*</span>
        </label>
        <input
          {...fieldProps("subject")}
          type="text"
          placeholder="Brief summary of your question or suggestion"
          onChange={(e) => update("subject", e.target.value)}
        />
        {errors.subject && (
          <p className="field-error" id="subject-error" role="alert">
            ⚠️ {errors.subject}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="message">
          Message <span className="required-star" aria-hidden="true">*</span>
        </label>
        <textarea
          {...fieldProps("message")}
          rows={6}
          placeholder="Type your message here (minimum 10 characters)..."
          onChange={(e) => update("message", e.target.value)}
        />
        {errors.message && (
          <p className="field-error" id="message-error" role="alert">
            ⚠️ {errors.message}
          </p>
        )}
      </div>

      <div className="form-actions">
        <button className="btn btn-start" type="submit">
          Send Message
        </button>
        <p className="form-note">
          Opens a pre-filled draft in your default email client. No third-party data collection.
        </p>
      </div>
    </form>
  );
}
