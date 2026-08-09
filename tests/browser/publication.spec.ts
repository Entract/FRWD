import { expect, test, type Request } from "@playwright/test";
import { publishFixture } from "./support/publications.js";

/**
 * A published FRWD, in a real browser, opened as a local file.
 *
 * Every assertion here is one of the format's public promises. If one of them
 * only holds in a single engine, the promise is not true.
 */

const MINIMAL = publishFixture("minimal/minimal");
const COMPONENTS = publishFixture("components/rich-components");

/** Requests that leave the machine. Opening a document must produce none. */
function offMachine(request: Request): boolean {
  return !request.url().startsWith("file://") && !request.url().startsWith("data:");
}

test.describe("baseline rendering", () => {
  test("renders the document's text", async ({ page }) => {
    await page.goto(MINIMAL);

    await expect(page.locator("h1")).toHaveText("Minimal FRWD");
    await expect(page.getByText("The smallest document that still exercises")).toBeVisible();
    await expect(page.locator("figcaption")).toContainText("Invariant 1");
    await expect(page.locator("li")).toHaveCount(3);
  });

  test("applies the document's own stylesheet", async ({ page }) => {
    await page.goto(MINIMAL);

    // The document sets a measure; if its CSS did not survive publishing, the
    // main element would be viewport-wide.
    const width = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBeLessThan(700);
  });
});

test.describe("the runtime", () => {
  test("installs itself", async ({ page }) => {
    await page.goto(MINIMAL);
    await expect(page.locator("html")).toHaveAttribute("data-frwd-runtime", "active");
  });

  test("marks every rich component as hydrated", async ({ page }) => {
    await page.goto(COMPONENTS);

    await expect(page.locator("frwd-callout")).toHaveAttribute("data-frwd-hydrated", "static");
    await expect(page.locator("frwd-chart")).toHaveAttribute("data-frwd-hydrated", "static");
    await expect(page.locator("frwd-disclosure")).toHaveAttribute("data-frwd-hydrated", "interactive");
  });

  test("makes the reference disclosure work", async ({ page }) => {
    await page.goto(COMPONENTS);

    const toggle = page.locator("[data-frwd-disclosure-toggle]");
    const body = page.locator("[data-frwd-disclosure-body]");
    const disclosure = page.locator("frwd-disclosure");

    await expect(body).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(body).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(disclosure).toHaveAttribute("data-frwd-expanded", "true");

    await toggle.click();
    await expect(body).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("offline", () => {
  test("opening a publication contacts nothing", async ({ page }) => {
    const escaped: string[] = [];
    page.on("request", (request) => {
      if (offMachine(request)) escaped.push(request.url());
    });

    await page.goto(COMPONENTS);
    await page.locator("[data-frwd-disclosure-toggle]").click();
    await page.waitForTimeout(250);

    expect(escaped).toEqual([]);
  });

  test("renders with the network cut off entirely", async ({ page, context }) => {
    // Not merely "makes no requests": prove the document needs none. Every
    // off-machine request is refused, and the page must be unaffected.
    await context.route((url) => !url.protocol.startsWith("file"), (route) => route.abort());

    await page.goto(COMPONENTS);
    await expect(page.locator("h1")).toHaveText("Rich components");
    await expect(page.locator("html")).toHaveAttribute("data-frwd-runtime", "active");
    await expect(page.locator("img")).toHaveCount(1);
  });
});

test.describe("print", () => {
  test("exposes content collapsed in a FRWD disclosure", async ({ page }) => {
    // The guarantee: FRWD's own disclosure primitive prints expanded in every
    // engine, with no script involved.
    await page.goto(COMPONENTS);

    const body = page.locator("[data-frwd-disclosure-body]");
    await expect(body).toBeHidden();

    await page.emulateMedia({ media: "print" });
    await expect(body).toBeVisible();

    await page.emulateMedia({ media: "screen" });
    await expect(body).toBeHidden();
  });

  test("exposes content collapsed in a native details, where the engine allows it", async ({ page, browserName }) => {
    // Not a guarantee, and the suite says so rather than quietly asserting a
    // weaker claim. No CSS can force-expand a closed <details> in every engine
    // today: `::details-content` covers Chromium and Firefox, WebKit has
    // neither that nor an equivalent. So substantive content belongs in a
    // frwd-disclosure, or in <details open>. See t-018.
    test.skip(browserName === "webkit", "WebKit cannot expand a closed <details> from CSS.");

    await page.goto(COMPONENTS);
    const body = page.locator("details > p");
    await expect(body).toBeHidden();

    await page.emulateMedia({ media: "print" });
    await expect(body).toBeVisible();
  });
});

test.describe("narrow viewport", () => {
  test("stays readable on a phone-sized screen", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(COMPONENTS);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Ordinary prose continues")).toBeVisible();

    // Nothing may overflow horizontally: a document that needs sideways
    // scrolling on a phone has not reflowed, it has been shrunk.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
