import { useState } from "react";

/**
 * Where the form sends to. There is no backend mail endpoint - and adding one
 * would break the project's offline-only constraint - so submitting composes a
 * message in the visitor's own mail client via a mailto: link.
 *
 * TODO: replace with the team address you actually want to receive mail on.
 */
const TEAM_EMAIL = "your-team-address@example.com";

type Field = "name" | "email" | "subject" | "message";

type Values = Record<Field, string>;

const EMPTY: Values = { name: "", email: "", subject: "", message: "" };

function validate(values: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};

  if (!values.name.trim()) {
    errors.name = "Please tell us your name.";
  }

  if (!values.email.trim()) {
    errors.email = "We need an address to reply to.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "That doesn't look like an email address.";
  }

  if (!values.subject.trim()) {
    errors.subject = "Add a short subject.";
  }

  if (values.message.trim().length < 10) {
    errors.message = "Please write at least 10 characters.";
  }

  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sent, setSent] = useState(false);

  function update(field: Field, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear a field's error as soon as the visitor starts fixing it, rather
    // than leaving red text sitting under a field they're actively editing.
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(values);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      const firstInvalid = (["name", "email", "subject", "message"] as Field[]).find(
        (field) => found[field],
      );
      if (firstInvalid) document.getElementById(firstInvalid)?.focus();
      return;
    }

    const body = `${values.message.trim()}\n\n— ${values.name.trim()} (${values.email.trim()})`;
    const href =
      `mailto:${TEAM_EMAIL}` +
      `?subject=${encodeURIComponent(values.subject.trim())}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = href;
    setSent(true);
  }

  function fieldProps(field: Field) {
    return {
      id: field,
      name: field,
      value: values[field],
      "aria-invalid": errors[field] ? (true as const) : undefined,
      "aria-describedby": errors[field] ? `${field}-error` : undefined,
      className: `field-input ${errors[field] ? "has-error" : ""}`,
    };
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="field-row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            {...fieldProps("name")}
            type="text"
            autoComplete="name"
            onChange={(e) => update("name", e.target.value)}
          />
          {errors.name && (
            <p className="field-error" id="name-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            {...fieldProps("email")}
            type="email"
            autoComplete="email"
            onChange={(e) => update("email", e.target.value)}
          />
          {errors.email && (
            <p className="field-error" id="email-error">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input
          {...fieldProps("subject")}
          type="text"
          onChange={(e) => update("subject", e.target.value)}
        />
        {errors.subject && (
          <p className="field-error" id="subject-error">
            {errors.subject}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea
          {...fieldProps("message")}
          rows={6}
          onChange={(e) => update("message", e.target.value)}
        />
        {errors.message && (
          <p className="field-error" id="message-error">
            {errors.message}
          </p>
        )}
      </div>

      <div className="form-actions">
        <button className="btn btn-start" type="submit">
          Send message
        </button>
        <p className="form-note" role="status">
          {sent
            ? "Your mail app should have opened with the message ready to send."
            : "Opens in your own mail app — nothing is sent from this page."}
        </p>
      </div>
    </form>
  );
}
