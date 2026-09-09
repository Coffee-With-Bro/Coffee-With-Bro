import { Link } from "../components/Link";

export function About() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">About</p>
        <h1 className="page-title">Sign language to text, entirely on your own machine.</h1>
        <p className="lede">
          Coffee with Bro reads American Sign Language hand signs from a webcam and
          turns them into text on screen. No API keys, no cloud service, no
          pretrained model downloaded from anyone else — the model is trained from
          scratch on our own machines, and every frame stays on yours.
        </p>
      </header>

      <section className="panel">
        <h2 className="section-title">The problem</h2>
        <p>
          Most sign-recognition demos hand your camera feed to a paid cloud API.
          That makes them unusable offline, dependent on a service that can change
          or disappear, and awkward for anything private. For a tool meant to help
          with everyday communication, sending a live video stream of someone's
          hands to a third party is a strange default.
        </p>
        <p>
          So we set a harder constraint on ourselves: the whole pipeline — dataset
          preparation, training, and live recognition — has to run locally, using
          only libraries we can vendor and a model we trained ourselves.
        </p>
      </section>

      <section className="panel">
        <h2 className="section-title">How it works</h2>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <div>
              <h3>Capture</h3>
              <p>
                The browser opens your webcam with <code>getUserMedia</code> and
                grabs frames from the live video element. Nothing is recorded or
                stored.
              </p>
            </div>
          </li>
          <li>
            <span className="step-num">2</span>
            <div>
              <h3>Stream</h3>
              <p>
                Frames travel to the Java backend over a WebSocket at{" "}
                <code>/ws/echo</code>. A WebSocket stays open, so we avoid the
                cost of a fresh HTTP request many times a second.
              </p>
            </div>
          </li>
          <li>
            <span className="step-num">3</span>
            <div>
              <h3>Classify</h3>
              <p>
                The backend resizes each frame to 128×128, normalises it, and runs
                it through a convolutional neural network built with
                DeepLearning4j. It returns a label and a confidence score.
              </p>
            </div>
          </li>
          <li>
            <span className="step-num">4</span>
            <div>
              <h3>Assemble</h3>
              <p>
                The interface shows the current guess with its confidence, and
                appends accepted letters to a running transcript you can space,
                backspace, and clear.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="panel">
        <h2 className="section-title">Scope</h2>
        <p>
          The system recognises <strong>36 static signs</strong> — the 26 ASL
          alphabet letters and the digits 0–9. Static means the sign is a held
          hand shape rather than a movement through space; recognising motion
          signs is a substantially different problem and is out of scope for this
          semester.
        </p>
        <div className="callout">
          <h3>Planned, not yet built</h3>
          <p>
            Two extensions are designed but not implemented: a{" "}
            <strong>personal sign dictionary</strong>, where you teach the app your
            own gestures instead of relying on a fixed dataset, and a{" "}
            <strong>confirm/correct feedback loop</strong> that strengthens the
            reference set for a sign each time you confirm a reading. Both appear
            as stretch items in our use case diagram.
          </p>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Course context</h2>
        <dl className="facts">
          <div>
            <dt>Course</dt>
            <dd>UCS503 — Software Engineering</dd>
          </div>
          <div>
            <dt>Programme</dt>
            <dd>B.Tech, 3rd Year</dd>
          </div>
          <div>
            <dt>Institute</dt>
            <dd>Thapar Institute of Engineering and Technology</dd>
          </div>
          <div>
            <dt>Academic year</dt>
            <dd>2026–27, Odd Semester</dd>
          </div>
        </dl>
        <p className="muted">
          Built by four students. <Link to="/team">Meet the team →</Link>
        </p>
      </section>
    </main>
  );
}
