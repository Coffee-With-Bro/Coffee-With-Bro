import { Link } from "../components/Link";

const LAST_UPDATED = "15 September 2026";

export function Legal() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">Legal</p>
        <h1 className="page-title">Terms of use &amp; privacy policy.</h1>
        <p className="lede">
          Coffee with Bro is a student project built for a university course, not
          a commercial product. Both documents live on this page. Last updated{" "}
          {LAST_UPDATED}.
        </p>
        <nav className="jump" aria-label="On this page">
          <a href="#terms">Terms of use</a>
          <a href="#privacy">Privacy policy</a>
        </nav>
      </header>

      <section className="panel" id="terms">
        <h2 className="section-title">Terms of use</h2>

        <h3 className="sub-title">1. What this is</h3>
        <p>
          Coffee with Bro is coursework produced for UCS503 Software Engineering
          at Thapar Institute of Engineering and Technology. It is provided for
          demonstration, learning and academic assessment. It is not a commercial
          service and carries no service-level guarantee of any kind.
        </p>

        <h3 className="sub-title">2. Not a substitute for a human interpreter</h3>
        <p>
          The system recognises 36 static hand shapes with imperfect accuracy. It
          does not understand grammar, context, facial expression or the movement
          that carries much of the meaning in real signed conversation.{" "}
          <strong>
            Do not rely on it for medical, legal, emergency, educational or any
            other consequential communication.
          </strong>{" "}
          Where accurate interpretation matters, use a qualified human interpreter.
        </p>

        <h3 className="sub-title">3. Acceptable use</h3>
        <p>You agree not to:</p>
        <ul className="bullets">
          <li>Use the software to record or analyse anyone without their knowledge and consent.</li>
          <li>Present its output as a certified or professional translation.</li>
          <li>Attempt to disrupt, overload or gain unauthorised access to any machine running it.</li>
          <li>Remove attribution from the source or redistribute it as your own coursework.</li>
        </ul>

        <h3 className="sub-title">4. Accuracy</h3>
        <p>
          Recognition quality depends on lighting, camera quality, background,
          hand position and how closely a sign matches the training data. Every
          prediction is shown with a confidence score precisely because it may be
          wrong. Treat low-confidence readings as guesses.
        </p>

        <h3 className="sub-title">5. No warranty</h3>
        <p>
          The software is provided "as is", without warranty of any kind, express
          or implied, including but not limited to the warranties of
          merchantability and fitness for a particular purpose. The authors accept
          no liability for any claim, damage or other liability arising from its
          use.
        </p>

        <h3 className="sub-title">6. Intellectual property</h3>
        <p>
          The code and documentation are the work of the four team members named
          on the <Link to="/team">team page</Link>. Third-party libraries and the
          training dataset remain the property of their respective owners and are
          credited on the <Link to="/resources">resources page</Link>.
        </p>

        <h3 className="sub-title">7. Changes</h3>
        <p>
          These terms may change as the project develops through the semester. The
          date at the top of this page reflects the most recent revision.
        </p>
      </section>

      <section className="panel" id="privacy">
        <h2 className="section-title">Privacy policy</h2>

        <div className="callout callout-accent">
          <h3>The short version</h3>
          <p>
            We don't collect anything. There is no account, no analytics, no
            tracking, and no cloud service involved. Your camera feed goes to a
            server you are running yourself, and is discarded the moment it has
            been classified.
          </p>
        </div>

        <h3 className="sub-title">1. Camera data</h3>
        <p>
          The app requests camera access through your browser's standard
          permission prompt, which you can refuse or revoke at any time. Frames
          are captured, sent over a local WebSocket connection to the backend,
          classified, and then discarded. No frame is written to disk, retained in
          a database, or transmitted to any third party. Nothing is recorded.
        </p>

        <h3 className="sub-title">2. Where the processing happens</h3>
        <p>
          Everything runs on machines you control — typically the backend on{" "}
          <code>localhost</code> on the same computer as the browser. The project
          has no external API dependency by design, which is the reason it works
          with no internet connection at all.
        </p>

        <h3 className="sub-title">3. Transcript text</h3>
        <p>
          The text assembled from recognised signs lives only in your browser tab's
          memory. Closing or refreshing the tab clears it. It is never uploaded,
          and we cannot see it.
        </p>

        <h3 className="sub-title">4. Cookies and analytics</h3>
        <p>
          This site sets no cookies and runs no analytics, advertising or
          fingerprinting scripts. Nothing about your visit is measured.
        </p>

        <h3 className="sub-title">5. Third-party requests</h3>
        <p>
          The interface loads two typefaces — Space Grotesk and JetBrains Mono —
          from Google Fonts, which means your browser makes a request to Google's
          font servers and Google receives your IP address as part of that
          request. This is the only outbound request the page makes. Self-hosting
          the font files would remove it, and is on our list.
        </p>

        <h3 className="sub-title">6. The contact form</h3>
        <p>
          The form on the <Link to="/team">team page</Link> does not submit to a
          server. It validates what you typed and then hands it to your own email
          client as a pre-filled draft. Nothing leaves your machine until you
          press send in your mail app, and whatever you send is then subject to
          your email provider's policies, not ours.
        </p>

        <h3 className="sub-title">7. Children</h3>
        <p>
          This project is not directed at children under 13. Since we collect no
          data from anyone, we hold no data about children either.
        </p>

        <h3 className="sub-title">8. Your rights</h3>
        <p>
          Rights of access, correction and deletion generally apply to data a
          service holds about you. We hold none, so there is nothing for us to
          disclose or erase. If you have questions about this, contact us through
          the <Link to="/team">team page</Link>.
        </p>
      </section>
    </main>
  );
}
