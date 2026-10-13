import { Link } from "../components/Link";
import { FaqSection } from "../components/FaqSection";

export function About() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">About the Project</p>
        <h1 className="page-title">Sign language to text, entirely on your own machine.</h1>
        <p className="lede">
          Coffee with Bro reads American Sign Language hand signs from a webcam and
          turns them into text on screen. No API keys, no cloud service, and no
          pretrained model downloaded from anyone else — the model is trained from
          scratch, and every frame stays on your device.
        </p>
      </header>

      <section className="panel">
        <h2 className="section-title">The Problem We Solved</h2>
        <p>
          Most sign-recognition demos hand your camera feed to a paid cloud API.
          That makes them unusable offline, dependent on external network connectivity,
          and awkward for personal privacy. For a tool meant to help with everyday
          communication, sending a live video stream of someone's hands to a third party
          is a questionable default.
        </p>
        <p>
          So we set a harder constraint on ourselves: the whole pipeline — dataset
          preparation, CNN training, and live webcam recognition — has to run locally,
          using only libraries we can vendor and a model we trained ourselves.
        </p>
      </section>

      {/* Zero CLS System Architecture Media with WebP */}
      <section className="panel">
        <h2 className="section-title">System Architecture</h2>
        <div className="about-media-wrap">
          <picture>
            <source srcSet="/og-image.webp" type="image/webp" />
            <img
              src="/og-image.png"
              alt="Coffee with Bro system architecture banner showcasing offline WebSocket pipeline and DeepLearning4j inference"
              className="about-system-img"
              width={1200}
              height={630}
              loading="lazy"
            />
          </picture>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">How It Works</h2>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <div>
              <h3>Capture</h3>
              <p>
                The browser opens your webcam with <code>getUserMedia</code> and
                grabs frames from the live video element. Nothing is recorded or
                saved to disk.
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
                overhead of fresh HTTP requests multiple times a second.
              </p>
            </div>
          </li>
          <li>
            <span className="step-num">3</span>
            <div>
              <h3>Classify</h3>
              <p>
                The backend resizes each frame to 128×128, normalizes it, and runs
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
                backspace, copy, or read aloud with text-to-speech.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="panel">
        <h2 className="section-title">Scope &amp; Recognized Signs</h2>
        <p>
          The system recognizes <strong>36 static signs</strong> — the 26 ASL
          alphabet letters and the digits 0–9. Static means the sign is a held
          hand shape rather than a movement through space; recognizing motion
          signs requires multi-frame temporal modeling, which is out of scope for
          this semester's milestone.
        </p>
      </section>

      {/* Interactive FAQ Section with Schema.org JSON-LD */}
      <FaqSection />

      <section className="panel">
        <h2 className="section-title">Course Context &amp; Credits</h2>
        <dl className="facts">
          <div>
            <dt>Course</dt>
            <dd>UCS503 — Software Engineering</dd>
          </div>
          <div>
            <dt>Programme</dt>
            <dd>B.Tech Computer Science, 3rd Year</dd>
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
        <p className="muted" style={{ marginTop: "16px" }}>
          Built collaboratively by four students. <Link to="/team">Meet the team and read author bios →</Link>
        </p>
      </section>
    </main>
  );
}
