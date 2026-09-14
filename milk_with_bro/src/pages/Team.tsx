import { ContactForm } from "../components/ContactForm";

const MEMBERS = [
  {
    name: "Keshav Aggarwal",
    roll: "1024030234",
    role: "Frontend & integration",
    blurb:
      "Works on the Spring Boot service and the UML models — use case and activity diagrams — that the implementation follows.",
  },
  {
    name: "Abhishek Srivastava",
    roll: "1024030236",
    role: "Pre-processing & CNN",
    blurb:
      "Builds the Python pipeline that cleans and resizes the raw ASL dataset, and the DeepLearning4j training code that turns it into a model.",
  },
  {
    name: "Harshine Singh",
    roll: "1024030232",
    role: "Backend & system design",
    blurb:
      "Owns the browser interface and the WebSocket link that carries frames to the backend and predictions back.",
  },
  {
    name: "Bhuvaneesh Singh Grewal",
    roll: "1024030235",
    role: "Documentation & testing",
    blurb:
      "Keeps the SRS and supporting documents current, and checks the pipeline end to end across the team's machines.",
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
  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">Team</p>
        <h1 className="page-title">Four students, one offline translator.</h1>
        <p className="lede">
          We're third-year B.Tech students at Thapar Institute, building this for
          UCS503 Software Engineering. The system splits into three decoupled
          parts, each owned mainly by one of us, so the components could be built
          in parallel.
        </p>
      </header>

      <section className="team-grid">
        {MEMBERS.map((member) => (
          <article className="member" key={member.roll}>
            <div className="member-top">
              <span className="avatar" aria-hidden="true">
                {initials(member.name)}
              </span>
              <div>
                <h2 className="member-name">{member.name}</h2>
                <p className="member-roll">{member.roll}</p>
              </div>
            </div>
            <p className="member-role">{member.role}</p>
            <p className="member-blurb">{member.blurb}</p>
          </article>
        ))}
      </section>

      <section className="panel" id="contact">
        <h2 className="section-title">Contact us</h2>
        <p className="muted contact-intro">
          Questions about the project, the model, or the code? Send us a note and
          one of us will get back to you.
        </p>
        <ContactForm />
      </section>
    </main>
  );
}
