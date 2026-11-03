export interface PageMetadata {
  title: string;
  description: string;
  robots?: string;
}

export const ROUTE_METADATA: Record<string, PageMetadata> = {
  "/": {
    title: "Coffee with Bro — Real-Time Offline ASL Sign Language Translator",
    description:
      "Translate American Sign Language (ASL) hand signs to text in real time using your webcam. 100% offline, privacy-first, zero cloud APIs.",
  },
  "/about": {
    title: "About the System — Coffee with Bro",
    description:
      "Learn how Coffee with Bro captures, preprocesses, and classifies ASL signs locally using Spring Boot, DeepLearning4j, and React.",
  },
  "/team": {
    title: "Team & Contact Details — Coffee with Bro",
    description:
      "Meet the student engineering team at Thapar Institute of Engineering and Technology and find verified direct contact details.",
  },
  "/resources": {
    title: "Resources & Open Source Attribution — Coffee with Bro",
    description:
      "Complete inventory of software libraries, datasets, and open source licenses used to build Coffee with Bro.",
  },
  "/legal": {
    title: "Terms of Use & Academic Disclaimer — Coffee with Bro",
    description:
      "Terms of service, academic assessment disclaimer, and usage rules for the Coffee with Bro offline sign language translator.",
  },
  "/privacy": {
    title: "Privacy Policy — 100% On-Device Guarantee — Coffee with Bro",
    description:
      "Read our zero-data-collection privacy policy. Camera frames never leave local RAM; zero telemetry, zero trackers, and zero cookies.",
  },
  "/thank-you": {
    title: "Thank You — Message Sent — Coffee with Bro",
    description:
      "Thank you for contacting the Coffee with Bro team. We have received your submission and will respond promptly.",
  },
  "/diagnostics": {
    title: "System Diagnostics & Telemetry — Coffee with Bro",
    description:
      "Inspect live Spring Boot backend health, DL4J CNN inference engine state, WebSocket responsiveness, and database persistence metrics.",
  },
};

export function updatePageMetadata(route: string | null) {
  if (typeof document === "undefined") return;

  const meta = (route && ROUTE_METADATA[route]) || {
    title: "404 Page Not Found — Coffee with Bro",
    description: "The requested page does not exist on the Coffee with Bro application.",
    robots: "noindex, nofollow",
  };

  // Update Title
  document.title = meta.title;

  // Update or create meta description
  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement("meta");
    descTag.setAttribute("name", "description");
    document.head.appendChild(descTag);
  }
  descTag.setAttribute("content", meta.description);

  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", meta.title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", meta.description);

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute("content", meta.title);

  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute("content", meta.description);

  // Update Robots
  let robotsTag = document.querySelector('meta[name="robots"]');
  if (meta.robots) {
    if (!robotsTag) {
      robotsTag = document.createElement("meta");
      robotsTag.setAttribute("name", "robots");
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute("content", meta.robots);
  } else if (robotsTag) {
    robotsTag.setAttribute("content", "index, follow");
  }

  // Update Canonical
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", `https://coffeewithbro.local${route ?? "/404"}`);
}
