import { ContactForm } from "../components/ContactForm";

export interface TeamMember {
  name: string;
  roll: string;
  email: string;
  role: string;
  bio: string;
  skills: string[];
  github?: string;
}

const MEMBERS: TeamMember[] = [
  {
    name: "Keshav Aggarwal",
    roll: "1024030234",
    email: "ka9812204392@gmail.com",
    role: "Frontend & WebSocket Integration Lead",
    bio:
      "Third-year B.Tech Computer Science student specializing in interactive web engineering and real-time systems. Developed the React 19 interface, low-latency WebSocket communication client, webcam viewfinder with confidence meters, and client-side speech synthesis.",
    skills: ["React 19", "TypeScript", "WebSocket Streaming", "Vite", "UI/UX Accessibility"],
    github: "https://github.com/k-keshav-aggarwal",
  },
  {
    name: "Karanveer Singh",
    roll: "1024030240",
    email: "ksingh_be24@thapar.edu",
    role: "Software Engineering & Systems Integration",
    bio:
      "Third-year B.Tech Computer Science student at Thapar Institute specializing in software engineering, system architecture, and cloud services integration.",
    skills: ["Java", "Spring Boot", "TypeScript", "React", "System Integration"],
    github: "https://github.com/k-keshav-aggarwal",
  },
  {
    name: "Abhishek Srivastava",
    roll: "1024030236",
    email: "asrivastava_be24@thapar.edu",
    role: "Machine Learning & Dataset Preprocessing Lead",
    bio:
      "Computer Science undergraduate with a focus on computer vision and neural network pipelines. Built the Python image normalization workflow for 128×128 inputs, MediaPipe 21-point hand landmark extraction, and the baseline PyTorch training pipeline.",
    skills: ["Python", "PyTorch", "OpenCV", "MediaPipe", "Data Engineering"],
    github: "https://github.com/abh1sh3k-14",
  },
  {
    name: "Harshine Singh",
    roll: "1024030232",
    email: "hsingh_be24@thapar.edu",
    role: "Backend & Systems Architecture Lead",
    bio:
      "Undergraduate software engineer concentrating on backend services, concurrency, and embedded machine learning. Built the Spring Boot WebSocket inference service, DeepLearning4j JVM neural network loader, and local H2 database session persistence.",
    skills: ["Java 17", "Spring Boot", "DeepLearning4j", "ND4J", "WebSocket Protocols"],
    github: "https://github.com/HarshineEXCELS",
  },
  {
    name: "Bhuvaneesh Singh Grewal",
    roll: "1024030235",
    email: "bgrewal_be24@thapar.edu",
    role: "Software Engineering Documentation & QA Lead",
    bio:
      "Computer Science undergraduate focusing on software engineering methodologies, formal verification, and quality assurance. Author of the IEEE 830 SRS specification, UML activity and use-case architecture diagrams, and test suite verification.",
    skills: ["IEEE 830 SRS", "Software Architecture", "UML Modeling", "LaTeX", "End-to-End QA"],
    github: "https://github.com/bhuvaneeshgrewal",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function Team() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Team & Author Bios - Coffee with Bro",
    description: "Meet the student engineering team at Thapar Institute of Engineering and Technology who built the Coffee with Bro offline ASL recognition system.",
    author: MEMBERS.map((member) => ({
      "@type": "Person",
      name: member.name,
      jobTitle: member.role,
      description: member.bio,
      email: member.email,
      affiliation: {
        "@type": "CollegeOrUniversity",
        name: "Thapar Institute of Engineering and Technology",
        department: "Department of Computer Science and Engineering",
      },
    })),
  };

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="page-head">
        <p className="eyebrow">Team &amp; Authors</p>
        <h1 className="page-title">Five students, one offline translator.</h1>
        <p className="lede">
          We are 3rd-year B.Tech students in Computer Science at Thapar Institute
          of Engineering and Technology. Coffee with Bro was engineered for
          UCS503 Software Engineering as a modular, decoupled system.
        </p>
      </header>

      <section className="team-grid" aria-label="Author bios and team members">
        {MEMBERS.map((member) => (
          <article className="member author-card" key={member.roll}>
            <div className="member-top">
              <span className="avatar" aria-label={`Avatar initials for ${member.name}`}>
                {initials(member.name)}
              </span>
              <div>
                <h2 className="member-name">{member.name}</h2>
                <p className="member-roll">Roll: {member.roll} · Thapar Institute</p>
              </div>
            </div>
            <p className="member-role">{member.role}</p>
            <p className="member-blurb author-bio-text">{member.bio}</p>

            <div className="author-skills">
              {member.skills.map((skill) => (
                <span className="skill-pill" key={skill}>
                  {skill}
                </span>
              ))}
            </div>

            <div className="author-links">
              <a href={`mailto:${member.email}`} className="author-email-link">
                ✉️ {member.email}
              </a>
              {member.github && (
                <a
                  href={member.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="author-github-link"
                >
                  💻 GitHub
                </a>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="panel" id="contact-info">
        <h2 className="section-title">Verified Contact Information</h2>
        <p className="muted contact-intro">
          Reach out directly to the development team or visit our academic department.
        </p>

        <div className="contact-details-grid">
          <div className="contact-card">
            <span className="contact-icon" role="img" aria-label="University campus">🏫</span>
            <div>
              <h3>Academic Institution</h3>
              <p>Department of Computer Science &amp; Engineering</p>
              <p>Thapar Institute of Engineering and Technology</p>
              <p className="contact-sub">Bhadson Road, Patiala, Punjab 147004, India</p>
            </div>
          </div>

          <div className="contact-card">
            <span className="contact-icon" role="img" aria-label="Email inbox">✉️</span>
            <div>
              <h3>Direct Email</h3>
              <p>
                <a href="mailto:ka9812204392@gmail.com" className="contact-link">
                  ka9812204392@gmail.com
                </a>
              </p>
              <p className="contact-sub">Direct contact for questions, model testing &amp; evaluation</p>
            </div>
          </div>

          <div className="contact-card">
            <span className="contact-icon" role="img" aria-label="Open source code repository">💻</span>
            <div>
              <h3>Code Repository</h3>
              <p>
                <a
                  href="https://github.com/Keshav-Aggarwal-2004/Coffee-With-Bro"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="contact-link"
                >
                  GitHub / Coffee-With-Bro
                </a>
              </p>
              <p className="contact-sub">Full source code, documentation, and training scripts</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel" id="contact">
        <h2 className="section-title">Send Us a Direct Message</h2>
        <p className="muted contact-intro">
          Have questions or feedback? Fill in the form below to generate a direct email to our team.
        </p>
        <ContactForm />
      </section>
    </main>
  );
}
