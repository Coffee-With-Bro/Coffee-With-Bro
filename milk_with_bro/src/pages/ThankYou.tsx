import { Link } from "../components/Link";

export function ThankYou() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">Message Sent</p>
        <h1 className="page-title">Thank you for getting in touch!</h1>
        <p className="lede">
          We appreciate you reaching out about Coffee with Bro. Your message draft
          has been generated and prepared for our team.
        </p>
      </header>

      <section className="panel" style={{ textAlign: "center", padding: "36px 20px" }}>
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
            lineHeight: 1,
          }}
          role="img"
          aria-label="Celebration party popper"
        >
          🎉
        </div>

        <h2 className="section-title" style={{ marginBottom: "12px" }}>
          We'll get back to you soon
        </h2>
        <p className="muted" style={{ maxWidth: "480px", margin: "0 auto 28px", lineHeight: "1.6" }}>
          Our engineering team reviews project questions, model suggestions, and
          feedback regularly. Typical response time is 24–48 hours during the
          semester.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" className="btn btn-start">
            ← Back to Translator
          </Link>
          <Link to="/about" className="btn btn-ghost">
            About the Architecture
          </Link>
          <Link to="/team" className="btn btn-ghost">
            Meet the Team
          </Link>
        </div>
      </section>
    </main>
  );
}
