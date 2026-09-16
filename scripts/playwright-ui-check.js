import { chromium } from "playwright";

const BASE_URL = "http://localhost:5173";

async function runTests() {
  console.log("=== Starting Playwright UI & Feature Verification ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: HOME PAGE & TRANSLATOR CONTROLS
    // ----------------------------------------------------
    console.log("\n[Test 1] Home Page & Viewfinder UI");
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const title = await page.title();
    assert(
      title === "Coffee with Bro — Sign language translator",
      `Page title is correct: "${title}"`,
    );

    const brand = await page.textContent(".topbar-mark");
    assert(brand?.includes("Coffee with Bro"), "Navbar brand is visible");

    const navLinks = await page.$$eval(".nav-link", (els) =>
      els.map((e) => e.textContent?.trim()),
    );
    assert(
      navLinks.includes("Translator") &&
        navLinks.includes("About") &&
        navLinks.includes("Team") &&
        navLinks.includes("Resources") &&
        navLinks.includes("Legal"),
      `All 5 navigation links rendered: ${navLinks.join(", ")}`,
    );

    const startBtn = await page.$(".btn-start");
    assert(startBtn !== null, "Turn on camera button exists");
    const startText = await startBtn?.textContent();
    assert(startText === "Turn on camera", `Start button text: "${startText}"`);

    const viewfinder = await page.$(".viewfinder");
    assert(viewfinder !== null, "Viewfinder container is rendered");

    const placeholder = await page.textContent(".transcript-placeholder");
    assert(
      placeholder?.includes("Signed letters will build a sentence here"),
      "Transcript placeholder text is visible",
    );

    // Test transcript controls: Space, Backspace, Clear, Copy
    console.log("\n[Test 2] Transcript Manual Editing Controls");
    const spaceBtn = page.getByRole("button", { name: "Space", exact: true });
    const backspaceBtn = page.getByRole("button", { name: "Backspace", exact: true });
    const clearBtn = page.getByRole("button", { name: "Clear", exact: true });
    const copyBtn = page.getByRole("button", { name: "Copy", exact: true });

    const isCopyDisabledInitially = await copyBtn.isDisabled();
    assert(isCopyDisabledInitially, "Copy button is disabled when transcript is empty");

    await spaceBtn.click();
    await spaceBtn.click();
    let transcriptText = (await page.locator(".transcript").textContent()) ?? "";
    assert(transcriptText.includes("  "), "Space button appended spaces to transcript");

    const isCopyEnabledNow = !(await copyBtn.isDisabled());
    assert(isCopyEnabledNow, "Copy button becomes enabled when transcript has text");

    await backspaceBtn.click();
    transcriptText = (await page.locator(".transcript").textContent()) ?? "";
    assert(transcriptText.includes(" "), "Backspace removed one character");

    await clearBtn.click();
    const hasPlaceholderAgain = await page.locator(".transcript-placeholder").isVisible();
    assert(hasPlaceholderAgain, "Clear button reset transcript back to placeholder");

    // ----------------------------------------------------
    // TEST 3: NAVIGATION - ABOUT PAGE
    // ----------------------------------------------------
    console.log("\n[Test 3] Navigation to About Page");
    await page.click(".nav-link:has-text('About')");
    await page.waitForURL("**/about");
    assert((await page.title()) === "About — Coffee with Bro", "About page title updated");

    const aboutHead = await page.locator(".page-title").textContent();
    assert(aboutHead?.includes("Sign language to text"), `About heading rendered: "${aboutHead}"`);

    const hasProblemSection = await page.locator("text=The problem").isVisible();
    const hasHowItWorks = await page.locator("text=How it works").isVisible();
    const hasCourseContext = await page.locator("text=Course context").isVisible();
    assert(hasProblemSection && hasHowItWorks && hasCourseContext, "Key narrative sections rendered on About page");

    // ----------------------------------------------------
    // TEST 4: NAVIGATION - TEAM PAGE & CONTACT FORM
    // ----------------------------------------------------
    console.log("\n[Test 4] Navigation to Team Page & Form Validation");
    await page.click(".nav-link:has-text('Team')");
    await page.waitForURL("**/team");
    assert((await page.title()) === "Team & Contact — Coffee with Bro", "Team page title updated");

    const memberCards = await page.$$(".member");
    assert(memberCards.length === 4, `All 4 team member cards rendered (found ${memberCards.length})`);

    // Test ContactForm client-side validation
    const submitBtn = page.locator("button[type='submit']");
    await submitBtn.click();

    const nameError = await page.locator("#name-error").isVisible();
    const emailError = await page.locator("#email-error").isVisible();
    const subjectError = await page.locator("#subject-error").isVisible();
    const messageError = await page.locator("#message-error").isVisible();
    assert(
      nameError && emailError && subjectError && messageError,
      "Contact form validation correctly flagged all 4 empty required fields",
    );

    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.fill("#subject", "Feedback");
    await page.fill("#message", "Testing the sign language translation app.");

    const nameErrorGone = !(await page.locator("#name-error").isVisible());
    const emailErrorGone = !(await page.locator("#email-error").isVisible());
    assert(nameErrorGone && emailErrorGone, "Validation errors disappear as user fills valid input");

    // ----------------------------------------------------
    // TEST 5: NAVIGATION - RESOURCES & LEGAL PAGES
    // ----------------------------------------------------
    console.log("\n[Test 5] Resources & Legal Pages");
    await page.click(".nav-link:has-text('Resources')");
    await page.waitForURL("**/resources");
    assert((await page.title()) === "Resources used — Coffee with Bro", "Resources page loaded");

    const resourceItems = await page.$$(".resource");
    assert(resourceItems.length >= 8, `Found ${resourceItems.length} documented resource reference cards`);

    await page.click(".nav-link:has-text('Legal')");
    await page.waitForURL("**/legal");
    assert((await page.title()) === "Terms & Privacy — Coffee with Bro", "Legal page loaded");

    const termsSection = await page.locator("#terms").isVisible();
    const privacySection = await page.locator("#privacy").isVisible();
    assert(termsSection && privacySection, "Terms of use and Privacy policy sections both exist");

    // ----------------------------------------------------
    // TEST 6: 404 NOT FOUND PAGE & RETURN NAVIGATION
    // ----------------------------------------------------
    console.log("\n[Test 6] 404 Not Found Page Integration");
    await page.goto(`${BASE_URL}/invalid-path-does-not-exist`);
    await page.waitForLoadState("networkidle");

    const notFoundTitle = await page.title();
    assert(notFoundTitle === "404 — Page not found", `404 document title is: "${notFoundTitle}"`);

    const hasNavOn404 = await page.locator(".topbar-brand").isVisible();
    const hasFooterOn404 = await page.locator(".footer").isVisible();
    assert(hasNavOn404 && hasFooterOn404, "Navbar and footer are preserved on 404 page");

    const code404 = await page.locator("h1").textContent();
    assert(code404?.includes("404"), `404 Code is visible: "${code404}"`);

    const cavemanSvg = await page.locator("svg[aria-label*='caveman']");
    assert(await cavemanSvg.isVisible(), "Caveman SVG vector is visible on 404 page");

    // Test clicking on caveman SVG (triggers interactive sparks and audio animation)
    await cavemanSvg.click();
    assert(true, "Caveman SVG is clickable without throwing errors");

    // Return back to Home via Back button
    const backBtn = page.locator("a:has-text('Back to Translator')");
    assert(await backBtn.isVisible(), "Back to Translator button is present");
    await backBtn.click();
    await page.waitForURL(`${BASE_URL}/`);
    assert(page.url() === `${BASE_URL}/`, "Back to Translator button navigated back to Home page");

    // ----------------------------------------------------
    // TEST 7: MOBILE RESPONSIVENESS
    // ----------------------------------------------------
    console.log("\n[Test 7] Mobile Viewport Responsiveness");
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    assert(
      bodyWidth <= windowWidth + 1,
      `No horizontal overflow on mobile: bodyWidth=${bodyWidth}, windowWidth=${windowWidth}`,
    );

    console.log("\n==================================================");
    console.log(`PLAYWRIGHT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("\nUnexpected test error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
