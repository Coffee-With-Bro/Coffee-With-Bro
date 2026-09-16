import { useRef } from "react";
import { Link } from "../components/Link";
import styles from "./NotFound.module.css";

export function NotFound(): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const sparkRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const leftArmRef = useRef<SVGGElement>(null);
  const rightArmRef = useRef<SVGGElement>(null);

  function handleCavemanClick(): void {
    const animatedElements = [
      sparkRef.current,
      headRef.current,
      leftArmRef.current,
      rightArmRef.current,
    ].filter((element): element is SVGGElement => element !== null);

    for (const element of animatedElements) {
      element.style.animation = "none";
    }

    void svgRef.current?.getBoundingClientRect();

    for (const element of animatedElements) {
      element.style.removeProperty("animation");
    }

    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(220, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        60,
        context.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.06, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.12,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.addEventListener("ended", () => void context.close(), {
        once: true,
      });
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    } catch {
      // Audio is an optional enhancement and may be blocked by the browser.
    }
  }

  return (
    <main className={`page ${styles.notFoundPage}`}>
      <div className={styles.stage}>
        <h1 className={styles.code}>404</h1>

        <div className={styles.cavemanVectorContainer}>
          <svg
            ref={svgRef}
            viewBox="0 0 900 420"
            className={styles.cavemanSvg}
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Vector illustration of a caveman attempting to connect broken electric cables"
            onClick={handleCavemanClick}
          >
            <defs>
              <filter
                id="spark-glow"
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
              >
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="3.5"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <ellipse cx="205" cy="382" rx="55" ry="6" fill="#252a30" />
            <ellipse cx="695" cy="382" rx="90" ry="7" fill="#252a30" />
            <ellipse cx="450" cy="382" rx="68" ry="6" fill="#252a30" />

                    <g id="left-stones">
                      <path
                        d="M 175 380 C 160 380, 155 345, 155 295 C 155 235, 235 235, 235 295 C 235 345, 230 380, 215 380 Z"
                        fill="#e4e6ea"
                      />
                      <rect
                        x="135"
                        y="215"
                        width="135"
                        height="34"
                        rx="17"
                        fill="#d3d6dc"
                      />
                      <rect
                        x="168"
                        y="168"
                        width="36"
                        height="50"
                        rx="18"
                        fill="#e6e8ec"
                      />
                      <rect
                        x="206"
                        y="204"
                        width="30"
                        height="13"
                        rx="6.5"
                        fill="#ebecef"
                      />
                    </g>

                    <ellipse cx="96" cy="380" rx="12" ry="6" fill="#dadde2" />
                    <ellipse cx="112" cy="382" rx="6" ry="4" fill="#e8eaed" />
                    <g className={styles.bushLeft} fill="#28b346">
                      <circle cx="118" cy="370" r="16" />
                      <circle cx="136" cy="355" r="22" />
                      <circle cx="160" cy="362" r="18" />
                      <circle cx="142" cy="374" r="14" fill="#229b3c" />
                    </g>

                    <g className={styles.bushMid} fill="#28b346">
                      <circle cx="265" cy="374" r="12" />
                      <circle cx="280" cy="365" r="16" />
                      <circle cx="300" cy="372" r="14" />
                      <circle cx="316" cy="376" r="9" />
                    </g>
                    <circle cx="312" cy="381" r="4.5" fill="#dadde2" />

                    <g id="right-monolith">
                      <path
                        d="M 610 380 L 610 215 C 610 85, 780 85, 780 215 L 780 380 Z"
                        fill="#ebecef"
                      />
                    </g>

                    <ellipse cx="622" cy="378" rx="14" ry="7" fill="#dadde2" />
                    <ellipse cx="636" cy="381" rx="7" ry="4" fill="#e8eaed" />
                    <g className={styles.bushRightLeft} fill="#28b346">
                      <circle cx="575" cy="372" r="15" />
                      <circle cx="594" cy="360" r="20" />
                      <circle cx="612" cy="370" r="16" />
                    </g>
                    <ellipse cx="780" cy="380" rx="11" ry="5" fill="#dadde2" />
                    <g className={styles.bushRightFar} fill="#28b346">
                      <circle cx="770" cy="374" r="13" />
                      <circle cx="786" cy="364" r="18" />
                      <circle cx="804" cy="374" r="13" />
                    </g>

                    <g id="cables">
                      <path
                        className={styles.cableLeft}
                        d="M 245 380 L 370 380 C 400 380, 420 330, 428 278"
                        stroke="#222222"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <path
                        className={styles.cableRight}
                        d="M 650 380 L 530 380 C 500 380, 480 330, 472 278"
                        stroke="#222222"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>

                    <g id="caveman">
                      <rect
                        x="423"
                        y="305"
                        width="20"
                        height="72"
                        rx="4"
                        fill="#fab49b"
                      />
                      <rect
                        x="457"
                        y="305"
                        width="20"
                        height="72"
                        rx="4"
                        fill="#fab49b"
                      />
                      <path
                        d="M 410 373 C 410 370, 421 370, 423 370 L 443 370 L 443 380 L 414 380 C 410 380, 410 375, 410 373 Z"
                        fill="#fab49b"
                      />
                      <path
                        d="M 457 370 L 477 370 C 479 370, 490 370, 490 373 C 490 375, 490 380, 486 380 L 457 380 Z"
                        fill="#fab49b"
                      />

                      <g id="caveman-tunic">
                        <path
                          d="M 388 230 L 512 230 L 512 310 L 493 296 L 474 310 L 450 296 L 426 310 L 407 296 L 388 310 Z"
                          fill="#fca311"
                        />
                        <ellipse cx="406" cy="248" rx="5.5" ry="4.5" fill="#cf6808" />
                        <ellipse cx="430" cy="240" rx="4" ry="5" fill="#cf6808" />
                        <ellipse cx="478" cy="244" rx="6.5" ry="5" fill="#cf6808" />
                        <ellipse cx="415" cy="274" rx="5" ry="6" fill="#cf6808" />
                        <ellipse cx="456" cy="260" rx="6.5" ry="5" fill="#cf6808" />
                        <ellipse cx="496" cy="272" rx="4.5" ry="4.5" fill="#cf6808" />
                        <ellipse cx="440" cy="286" rx="5.5" ry="5" fill="#cf6808" />
                        <ellipse cx="476" cy="294" rx="5" ry="4" fill="#cf6808" />
                      </g>

                      <g ref={headRef} className={styles.cavemanHead}>
                        <ellipse cx="396" cy="190" rx="7" ry="9" fill="#fab49b" />
                        <ellipse cx="504" cy="190" rx="7" ry="9" fill="#fab49b" />
                        <rect
                          x="400"
                          y="155"
                          width="100"
                          height="70"
                          rx="20"
                          fill="#fab49b"
                        />
                        <path
                          d="M 395 185 C 390 120, 510 120, 505 185 C 498 175, 490 166, 478 168 C 468 156, 452 154, 444 163 C 434 154, 418 158, 412 168 C 402 168, 398 176, 395 185 Z"
                          fill="#4e301d"
                        />
                        <rect
                          x="393"
                          y="172"
                          width="10"
                          height="34"
                          rx="5"
                          fill="#4e301d"
                        />
                        <rect
                          x="497"
                          y="172"
                          width="10"
                          height="34"
                          rx="5"
                          fill="#4e301d"
                        />
                        <rect
                          x="418"
                          y="174"
                          width="24"
                          height="7"
                          rx="3.5"
                          fill="#351e0e"
                          className={styles.eyebrow}
                        />
                        <rect
                          x="458"
                          y="174"
                          width="24"
                          height="7"
                          rx="3.5"
                          fill="#351e0e"
                          className={styles.eyebrow}
                        />
                        <ellipse
                          cx="430"
                          cy="190"
                          rx="4.5"
                          ry="4"
                          fill="#222"
                          className={styles.eye}
                        />
                        <ellipse
                          cx="470"
                          cy="190"
                          rx="4.5"
                          ry="4"
                          fill="#222"
                          className={styles.eye}
                        />
                        <circle cx="429" cy="189" r="1.3" fill="#fff" />
                        <circle cx="469" cy="189" r="1.3" fill="#fff" />
                        <ellipse cx="450" cy="196" rx="8" ry="7" fill="#ee7158" />
                        <ellipse cx="449" cy="194" rx="3.5" ry="2.5" fill="#f8927e" />
                        <path
                          d="M 438 202 C 444 200, 450 205, 450 205 C 450 205, 456 200, 462 202 C 468 204, 468 210, 462 210 C 454 210, 450 206, 450 206 C 450 206, 446 210, 438 210 C 432 210, 432 204, 438 202 Z"
                          fill="#4e301d"
                        />
                        <path
                          d="M 395 198 C 388 225, 396 254, 414 257 C 426 261, 436 254, 450 258 C 464 254, 474 261, 486 257 C 504 254, 512 225, 505 198 C 496 210, 484 211, 484 211 C 476 225, 424 225, 416 211 C 416 211, 404 210, 395 198 Z"
                          fill="#4e301d"
                        />
                        <ellipse cx="450" cy="220" rx="4.5" ry="4" fill="#200e05" />
                        <rect
                          x="448"
                          y="217"
                          width="3"
                          height="3.5"
                          rx="0.5"
                          fill="#ffffff"
                        />
                      </g>

                      <g ref={leftArmRef} className={styles.cavemanArmLeftGroup}>
                        <path
                          d="M 392 232 L 358 255 C 352 260, 354 268, 362 272 L 428 280 C 432 281, 435 277, 433 273 L 404 236 Z"
                          fill="#fab49b"
                        />
                        <line
                          x1="380"
                          y1="262"
                          x2="382"
                          y2="268"
                          stroke="#4e301d"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <line
                          x1="385"
                          y1="264"
                          x2="387"
                          y2="270"
                          stroke="#4e301d"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <line
                          x1="390"
                          y1="266"
                          x2="392"
                          y2="272"
                          stroke="#4e301d"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <ellipse cx="428" cy="278" rx="7.5" ry="6.5" fill="#fab49b" />
                        <rect
                          x="432"
                          y="274"
                          width="10"
                          height="8"
                          rx="2"
                          fill="#222222"
                        />
                        <rect
                          x="442"
                          y="276"
                          width="5"
                          height="4"
                          rx="1"
                          fill="#c0c0c0"
                        />
                      </g>

                      <g ref={rightArmRef} className={styles.cavemanArmRightGroup}>
                        <path
                          d="M 508 232 L 542 255 C 548 260, 546 268, 538 272 L 472 280 C 468 281, 465 277, 467 273 L 496 236 Z"
                          fill="#fab49b"
                        />
                        <line
                          x1="520"
                          y1="262"
                          x2="518"
                          y2="268"
                          stroke="#4e301d"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <line
                          x1="515"
                          y1="264"
                          x2="513"
                          y2="270"
                          stroke="#4e301d"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <line
                          x1="510"
                          y1="266"
                          x2="508"
                          y2="272"
                          stroke="#4e301d"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <ellipse cx="472" cy="278" rx="7.5" ry="6.5" fill="#fab49b" />
                        <rect
                          x="458"
                          y="274"
                          width="10"
                          height="8"
                          rx="2"
                          fill="#222222"
                        />
                        <rect
                          x="453"
                          y="276"
                          width="5"
                          height="4"
                          rx="1"
                          fill="#c0c0c0"
                        />
                      </g>
                    </g>

                    <g
                      ref={sparkRef}
                      className={styles.sparkGroup}
                      filter="url(#spark-glow)"
                    >
                      <ellipse
                        className={styles.sparkFlash}
                        cx="450"
                        cy="278"
                        rx="42"
                        ry="32"
                        fill="#fff766"
                      />
                      <path
                        className={styles.sparkStar}
                        d="M 450 254 L 455 272 L 474 278 L 455 284 L 450 302 L 445 284 L 426 278 L 445 272 Z"
                        fill="#ffe600"
                      />
                      <path
                        className={styles.sparkStar}
                        d="M 450 262 L 453 274 L 465 278 L 453 282 L 450 294 L 447 282 L 435 278 L 447 274 Z"
                        fill="#ffffff"
                      />
                      <circle
                        className={`${styles.sparkParticle} ${styles.sparkP1}`}
                        cx="438"
                        cy="265"
                        r="3.5"
                        fill="#ffe600"
                      />
                      <circle
                        className={`${styles.sparkParticle} ${styles.sparkP2}`}
                        cx="462"
                        cy="263"
                        r="3"
                        fill="#00e5ff"
                      />
                      <circle
                        className={`${styles.sparkParticle} ${styles.sparkP3}`}
                        cx="436"
                        cy="291"
                        r="3"
                        fill="#00e5ff"
                      />
                      <circle
                        className={`${styles.sparkParticle} ${styles.sparkP4}`}
                        cx="464"
                        cy="293"
                        r="3.5"
                        fill="#ffe600"
                      />
                      <path
                        className={`${styles.sparkParticle} ${styles.sparkP1}`}
                        d="M 443 268 L 448 274 L 442 277 L 447 286"
                        stroke="#ffe600"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <path
                        className={`${styles.sparkParticle} ${styles.sparkP2}`}
                        d="M 457 270 L 452 275 L 458 279 L 453 288"
                        stroke="#00e5ff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>
                  </svg>
        </div>

        <div className={styles.contentBox}>
          <h2 className={styles.title}>Looks like you're lost</h2>
          <p className={styles.subtitle}>The page you are looking for doesn't exist or has moved.</p>
          <Link to="/" className="btn btn-start">
            Back to Translator
          </Link>
        </div>
      </div>
    </main>
  );
}
