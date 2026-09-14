type Resource = {
  name: string;
  version?: string;
  license: string;
  what: string;
  href: string;
};

type Group = { title: string; note: string; items: Resource[] };

const GROUPS: Group[] = [
  {
    title: "Backend",
    note: "Java service that holds the model and answers classification requests.",
    items: [
      {
        name: "Spring Boot",
        version: "4.1.0",
        license: "Apache-2.0",
        what: "Web server, dependency injection, and WebSocket support.",
        href: "https://spring.io/projects/spring-boot",
      },
      {
        name: "DeepLearning4j",
        version: "1.0.0-M2.1",
        license: "Apache-2.0",
        what: "Defines, trains and serialises the CNN, entirely on the JVM.",
        href: "https://deeplearning4j.konduit.ai/",
      },
      {
        name: "ND4J",
        version: "1.0.0-M2.1",
        license: "Apache-2.0",
        what: "The n-dimensional array maths underneath DL4J.",
        href: "https://github.com/deeplearning4j/deeplearning4j",
      },
      {
        name: "DataVec",
        version: "1.0.0-M2.1",
        license: "Apache-2.0",
        what: "Loads image folders into batches the network can train on.",
        href: "https://github.com/deeplearning4j/deeplearning4j",
      },
      {
        name: "H2",
        license: "MPL-2.0 / EPL-1.0",
        what: "Embedded database, used locally rather than a hosted one.",
        href: "https://www.h2database.com/",
      },
    ],
  },
  {
    title: "Frontend",
    note: "The browser interface you're looking at now.",
    items: [
      {
        name: "React",
        version: "19",
        license: "MIT",
        what: "Component model and rendering for the whole interface.",
        href: "https://react.dev/",
      },
      {
        name: "Vite",
        version: "8",
        license: "MIT",
        what: "Dev server and production bundler.",
        href: "https://vite.dev/",
      },
      {
        name: "TypeScript",
        version: "6",
        license: "Apache-2.0",
        what: "Static types across the frontend source.",
        href: "https://www.typescriptlang.org/",
      },
      {
        name: "WebSocket & getUserMedia",
        license: "Web standards",
        what: "Browser APIs for the camera feed and the open connection to the backend.",
        href: "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API",
      },
    ],
  },
  {
    title: "Data pipeline",
    note: "Python tooling that prepares images before any training happens.",
    items: [
      {
        name: "MediaPipe",
        license: "Apache-2.0",
        what: "Extracts 21 hand landmarks per image on the alternative landmark path.",
        href: "https://ai.google.dev/edge/mediapipe",
      },
      {
        name: "OpenCV",
        license: "Apache-2.0",
        what: "Reads and converts images during landmark extraction.",
        href: "https://opencv.org/",
      },
      {
        name: "Pillow",
        license: "MIT-CMU",
        what: "Resizes dataset images to a uniform 128×128.",
        href: "https://python-pillow.org/",
      },
      {
        name: "scikit-learn",
        license: "BSD-3-Clause",
        what: "Builds the reproducible 80/20 train-test split.",
        href: "https://scikit-learn.org/",
      },
      {
        name: "pandas",
        license: "BSD-3-Clause",
        what: "Writes landmark rows out to CSV.",
        href: "https://pandas.pydata.org/",
      },
      {
        name: "PyTorch",
        license: "BSD-3-Clause",
        what: "Used in the parallel Python training script we compared results against.",
        href: "https://pytorch.org/",
      },
      {
        name: "tqdm",
        license: "MIT / MPL-2.0",
        what: "Progress bars over long dataset passes.",
        href: "https://tqdm.github.io/",
      },
    ],
  },
  {
    title: "Dataset",
    note: "The images the model learns from. Not redistributed in this repository.",
    items: [
      {
        name: "ASL-HG hand gesture image dataset",
        license: "See dataset source",
        what: "~36,000 labelled photographs across 36 classes — A–Z and 0–9. Roughly 1,000 images per class.",
        href: "https://www.kaggle.com/datasets",
      },
    ],
  },
  {
    title: "Design & documentation",
    note: "Everything used to produce the interface and the coursework documents.",
    items: [
      {
        name: "Space Grotesk",
        license: "SIL OFL 1.1",
        what: "Interface typeface.",
        href: "https://fonts.google.com/specimen/Space+Grotesk",
      },
      {
        name: "JetBrains Mono",
        license: "SIL OFL 1.1",
        what: "Monospace face for readouts and transcript text.",
        href: "https://www.jetbrains.com/lp/mono/",
      },
      {
        name: "diagrams.net",
        license: "Apache-2.0",
        what: "Use case and activity diagrams, kept as editable .drawio files.",
        href: "https://www.diagrams.net/",
      },
      {
        name: "LaTeX",
        license: "LPPL",
        what: "Typesets the project proposal and SRS.",
        href: "https://www.latex-project.org/",
      },
      {
        name: "Maven & Git",
        license: "Apache-2.0 / GPL-2.0",
        what: "Build tooling and version control.",
        href: "https://maven.apache.org/",
      },
    ],
  },
];

export function Resources() {
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">Resources</p>
        <h1 className="page-title">What we built on.</h1>
        <p className="lede">
          Every library, dataset and tool this project depends on, and what each
          one actually does here. The model itself is trained from scratch — no
          pretrained weights are downloaded or used.
        </p>
      </header>

      {GROUPS.map((group) => (
        <section className="panel" key={group.title}>
          <h2 className="section-title">{group.title}</h2>
          <p className="muted group-note">{group.note}</p>

          <ul className="resource-list">
            {group.items.map((item) => (
              <li className="resource" key={item.name}>
                <div className="resource-head">
                  <a
                    className="resource-name"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {item.name}
                  </a>
                  {item.version && <span className="tag">v{item.version}</span>}
                  <span className="tag tag-quiet">{item.license}</span>
                </div>
                <p className="resource-what">{item.what}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="panel">
        <h2 className="section-title">A note on licensing</h2>
        <p className="muted">
          Licences above are listed for attribution and are correct to the best of
          our knowledge at the time of writing. This is student coursework, not a
          distributed product — if you intend to reuse any part of it, check each
          project's own licence text first.
        </p>
      </section>
    </main>
  );
}
