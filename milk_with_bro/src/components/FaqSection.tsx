import { useState } from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Does Coffee with Bro require internet access to translate sign language?",
    answer:
      "No. Coffee with Bro runs 100% offline. Hand gesture frames are processed strictly in local device memory by an onboard Spring Boot server hosting a DeepLearning4j CNN model. Zero cloud APIs, zero external servers, and zero telemetry.",
  },
  {
    question: "How does real-time ASL recognition work through the webcam?",
    answer:
      "The browser interface captures video snapshots every ~350ms, converts them to lightweight image payloads, and streams them over a persistent local WebSocket to the Java backend. The backend normalizes each frame to 128×128, runs inference across 36 static ASL classes, and returns the predicted character with a confidence score.",
  },
  {
    question: "Is my webcam video saved, stored, or uploaded anywhere?",
    answer:
      "Never. Video frames are held in temporary RAM solely for the few milliseconds required for neural network classification, and are immediately deallocated. Frames are never written to disk, saved to a database, or transmitted over the internet.",
  },
  {
    question: "Which sign language characters does the system recognize?",
    answer:
      "The system recognizes 36 static American Sign Language (ASL) classes: the 26 English alphabet letters (A through Z) and numbers 0 through 9.",
  },
  {
    question: "What technology stack is Coffee with Bro built with?",
    answer:
      "The frontend is built with React 19, TypeScript, and Vite. The backend inference service is built with Java 17 and Spring Boot using DeepLearning4j and ND4J. Dataset preparation and landmark experimentation were developed using Python, PyTorch, MediaPipe, and OpenCV.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="panel" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="section-title">Frequently Asked Questions</h2>
      <p className="muted" style={{ marginBottom: "16px" }}>
        Common questions about our offline architecture, privacy model, and neural network pipeline.
      </p>

      <div className="faq-list">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div className={`faq-item ${isOpen ? "is-open" : ""}`} key={faq.question}>
              <button
                type="button"
                className="faq-question"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
              >
                <span>{faq.question}</span>
                <span className="faq-toggle" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
