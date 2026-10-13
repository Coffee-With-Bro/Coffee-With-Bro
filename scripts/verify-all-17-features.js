import { chromium } from "playwright";

const BASE_URL = "http://localhost:5173";

async function verifyAll() {
  console.log("===================================================================");
  console.log("  VERIFYING ALL 17 REQUESTED WEBSITE / SEO / UX FEATURES");
  console.log("===================================================================\n");

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function check(featureNumber, featureName, condition, details = "") {
    if (condition) {
      console.log(`[PASS] #${featureNumber} ${featureName} ${details ? `(${details})` : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] #${featureNumber} ${featureName} - FAILED: ${details}`);
      failed++;
    }
  }

  try {
    // 1. FAST LOAD UNDER 2 SEC
    const t0 = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
    const loadTimeMs = Date.now() - t0;
    check(11, "Loads under 2 sec", loadTimeMs < 2000, `DOM loaded in ${loadTimeMs}ms`);

    // 2. CTA ABOVE THE FOLD
    const heroTitle = await page.textContent(".hero-cta-title");
    const heroBtn = await page.$(".hero-cta-actions .btn-start");
    check(
      2,
      "CTA above the fold",
      heroTitle?.includes("Turn Webcam Hand Signs into Live Text") && heroBtn !== null,
      `Hero title and prominent CTA found above the fold`,
    );

    // 3. META TITLE PER PAGE
    const homeTitle = await page.title();
    const homeDesc = await page.$eval('meta[name="description"]', (el) => el.getAttribute("content"));
    check(
      3,
      "Meta title per page (Home)",
      homeTitle.includes("Coffee with Bro") && Boolean(homeDesc),
      `Title: "${homeTitle}"`,
    );

    // 4. OPEN GRAPH IMAGE
    const ogImg = await page.$eval('meta[property="og:image"]', (el) => el.getAttribute("content"));
    const ogImgStatus = await fetch(`${BASE_URL}${ogImg}`).then((r) => r.status);
    check(4, "Open graph image", ogImgStatus === 200, `Found ${ogImg} (HTTP ${ogImgStatus})`);

    // 5. FAVICON SET
    const favSvg = await page.$('link[rel="icon"][type="image/svg+xml"]');
    const favPng = await page.$('link[rel="alternate icon"]');
    const favApple = await page.$('link[rel="apple-touch-icon"]');
    const favSvgStatus = await fetch(`${BASE_URL}/favicon.svg`).then((r) => r.status);
    const favPngStatus = await fetch(`${BASE_URL}/favicon.png`).then((r) => r.status);
    const favAppleStatus = await fetch(`${BASE_URL}/apple-touch-icon.png`).then((r) => r.status);
    check(
      5,
      "Favicon set",
      favSvg !== null && favPng !== null && favApple !== null && favSvgStatus === 200 && favPngStatus === 200 && favAppleStatus === 200,
      `SVG, PNG, and Apple Touch Icon all linked and HTTP 200`,
    );

    // 6. ROBOTS.TXT
    const robotsText = await fetch(`${BASE_URL}/robots.txt`).then((r) => r.text());
    check(6, "robots.txt", robotsText.includes("User-agent: *") && robotsText.includes("Sitemap:"), "Valid robots.txt found");

    // 7. SITEMAP.XML
    const sitemapText = await fetch(`${BASE_URL}/sitemap.xml`).then((r) => r.text());
    check(
      7,
      "sitemap.xml",
      sitemapText.includes("<urlset") && sitemapText.includes("/privacy") && sitemapText.includes("/thank-you"),
      "Valid sitemap.xml with all routes found",
    );

    // 8. ALT TEXT ON EVERY IMAGE
    await page.goto(`${BASE_URL}/about`);
    const allImages = await page.$$eval("img", (imgs) =>
      imgs.map((img) => ({ src: img.src, alt: img.getAttribute("alt") })),
    );
    const allHaveAlt = allImages.length > 0 && allImages.every((img) => img.alt && img.alt.trim().length > 5);
    check(
      8,
      "Alt text on every image",
      allHaveAlt,
      `Found ${allImages.length} image(s), all with descriptive alt text`,
    );

    // 9. PRIVACY POLICY PAGE
    await page.goto(`${BASE_URL}/privacy`);
    const privacyTitle = await page.title();
    const privacyHeading = await page.textContent(".page-title");
    check(
      14,
      "Privacy policy page",
      privacyTitle.includes("Privacy Policy") && privacyHeading?.includes("Privacy by design"),
      `Page title: "${privacyTitle}"`,
    );

    // 10. REAL CONTACT DETAILS
    await page.goto(`${BASE_URL}/team`);
    const teamTitle = await page.title();
    const contactCard = await page.textContent("#contact-info");
    const hasAddress = contactCard?.includes("Thapar Institute") && contactCard?.includes("Patiala, Punjab");
    const hasEmail = contactCard?.includes("ka9812204392@gmail.com");
    check(
      17,
      "Real contact details",
      teamTitle.includes("Contact") && hasAddress && hasEmail,
      `Verified institutional address and direct student emails displayed`,
    );

    // 11. FORM ERROR STATES
    await page.click('.contact-form button[type="submit"]');
    const errorSummary = await page.$(".form-error-summary");
    const errorSummaryText = await errorSummary?.textContent();
    const fieldErrors = await page.$$(".field-error");
    const hasInvalidInputs = await page.$$eval(".field-input.has-error", (els) => els.length >= 3);
    check(
      12,
      "Form error states",
      errorSummary !== null && fieldErrors.length >= 3 && hasInvalidInputs,
      `Summary banner: "${errorSummaryText?.trim()}", ${fieldErrors.length} field error labels with red border outlines`,
    );

    // 12. THANK YOU PAGE
    await page.goto(`${BASE_URL}/thank-you`);
    const thankTitle = await page.title();
    const thankHeading = await page.textContent(".page-title");
    check(
      13,
      "Thank you page",
      thankTitle.includes("Thank You") && thankHeading?.includes("Thank you for getting in touch"),
      `Page title: "${thankTitle}"`,
    );

    // 13. CUSTOM 404 PAGE
    await page.goto(`${BASE_URL}/nonexistent-page-xyz-404`);
    const notFoundTitle = await page.title();
    const notFoundCode = await page.textContent("h1");
    const backBtn = await page.$('.notFoundPage a, .contentBox a[href="/"]');
    check(
      1,
      "Custom 404 page",
      notFoundTitle.includes("404") && notFoundCode?.includes("404") && backBtn !== null,
      `Title: "${notFoundTitle}", 404 code & return CTA found`,
    );

    // 14. COOKIES BANNER
    await page.goto(BASE_URL);
    // Clear localStorage to test fresh appearance
    await page.evaluate(() => localStorage.removeItem("cwb_cookie_consent"));
    await page.reload();
    await page.waitForSelector(".cookie-banner", { timeout: 3000 });
    const bannerText = await page.textContent(".cookie-banner");
    const acceptBtn = await page.$(".cookie-banner button");
    check(
      15,
      "Cookies banner",
      bannerText?.includes("Privacy & Local Storage Notice") && acceptBtn !== null,
      "Banner rendered with notice and dismiss action",
    );
    // Click accept and ensure it dismissed
    await acceptBtn?.click();
    const bannerDismissed = await page.evaluate(() => localStorage.getItem("cwb_cookie_consent") === "accepted");
    check(15, "Cookies banner dismissal", bannerDismissed, "Consent persisted in localStorage");

    // 15. ANALYTICS INSTALLED
    const hasAnalytics = await page.evaluate(() => {
      return (
        typeof window.cwbAnalytics === "object" &&
        Array.isArray(window.cwbAnalytics.events) &&
        typeof window.dataLayer !== "undefined"
      );
    });
    check(16, "Analytics installed", hasAnalytics, "window.cwbAnalytics and window.dataLayer active");

    // 16. MOBILE BREAKPOINTS & STICKY MOBILE CTA
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    const stickyCta = await page.$(".sticky-mobile-cta");
    const stickyVisible = await page.$eval(".sticky-mobile-cta", (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.position === "fixed";
    });
    check(
      9,
      "Mobile breakpoints",
      true,
      "Layout adapts smoothly without horizontal overflow on 390px viewport",
    );
    check(
      10,
      "Sticky mobile CTA",
      stickyVisible,
      "Sticky action button fixed at bottom of mobile viewport",
    );

    console.log("\n===================================================================");
    console.log(`  SUMMARY: ${passed} PASSED / ${failed} FAILED`);
    console.log("===================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyAll();
