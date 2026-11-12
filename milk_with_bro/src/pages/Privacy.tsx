import { Link } from "../components/Link";

const LAST_UPDATED = "October 2026";

export function Privacy() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">Privacy Policy</p>
        <h1 className="page-title">Privacy by design: 100% on your device.</h1>
        <p className="lede">
          Coffee with Bro was built from the ground up to respect your privacy.
          All computer vision and deep learning inference execute locally in your
          browser and local host machine. Last updated {LAST_UPDATED}.
        </p>
      </header>

      <section className="panel">
        <div className="callout callout-accent">
          <h3>The Core Guarantee</h3>
          <p>
            We collect zero data. There are no accounts, no trackers, no
            telemetry, no external analytics cookies, and no cloud processing
            servers. Your webcam stream never leaves your physical machine.
          </p>
        </div>

        <h2 className="section-title">1. Camera Feed &amp; Video Data</h2>
        <p>
          The application requests access to your webcam using the standard HTML5{" "}
          <code>navigator.mediaDevices.getUserMedia</code> browser API.
        </p>
        <ul className="bullets">
          <li>
            <strong>Real-time Frame Snapshots:</strong> Individual frames are
            converted into Base64 images solely for classification by the local
            DeepLearning4j CNN backend.
          </li>
          <li>
            <strong>Immediate Deletion:</strong> After classification, frame
            buffers are immediately deallocated from RAM.
          </li>
          <li>
            <strong>No Disk Writes:</strong> Video frames are never written to disk,
            never saved to an external database, and never uploaded to any remote
            server.
          </li>
        </ul>

        <h2 className="section-title">2. Local Storage &amp; Cookies</h2>
        <p>
          This website uses <strong>zero third-party tracking or advertising cookies</strong>.
        </p>
        <p>
          We strictly use browser <code>localStorage</code> for client-side
          convenience:
        </p>
        <ul className="bullets">
          <li>
            <code>cwb_cookie_consent</code>: Remembers whether you have acknowledged
            our privacy and storage notice.
          </li>
          <li>
            <code>cwb_history</code>: Optionally saves your generated text
            transcripts locally on your machine so you can revisit them later.
          </li>
        </ul>

        <h2 className="section-title">3. Network Communication</h2>
        <p>
          The web application communicates exclusively over a local WebSocket
          connection (<code>ws://localhost:8081/ws/echo</code>).
          No communication is dispatched across external internet servers.
        </p>

        <h2 className="section-title">4. Third-Party Requests</h2>
        <p>
          The application loads fonts (Space Grotesk &amp; JetBrains Mono) from
          Google Fonts CDN. When your browser requests these font files, your IP
          address is transmitted to Google's CDN as part of standard HTTP delivery.
          No personal data or application activity is included in these requests.
        </p>

        <h2 className="section-title">5. Contact Information</h2>
        <p>
          If you have any questions or feedback regarding our privacy practices or
          academic project implementation, please feel free to reach out via our{" "}
          <Link to="/team">Team &amp; Contact page</Link> or email{" "}
          <a href="mailto:ka9812204392@gmail.com">ka9812204392@gmail.com</a>.
        </p>

        <div style={{ marginTop: "24px" }}>
          <Link to="/" className="btn btn-start">
            ← Return to Translator
          </Link>
        </div>
      </section>
    </main>
  );
}
