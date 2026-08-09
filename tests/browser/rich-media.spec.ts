import { expect, test, type Request } from "@playwright/test";
import { playViaUserGesture } from "./support/playback.js";
import { publishEditedFixture, publishFixture } from "./support/publications.js";

/**
 * Time-based media as part of a flowing document.
 *
 * This is the claim the rest of the corpus does not test: that a video can sit
 * inside the step it explains, and an audio reference inside the check that
 * uses it, without either becoming an attachment, a link, or a thing the layout
 * has to be built around.
 */

const MANUAL = publishFixture("rich-manual/field-calibration");

/** The same manual after a long paragraph is inserted above the video. */
const EDITED = publishEditedFixture("rich-manual/field-calibration", {
  op: "replace_text",
  target: "3c7a91d4-2b60-4e15-9a83-000000000026",
  text: [
    "Hold the mode button until the ring pulses, then release.",
    "The cycle takes about four seconds and must not be interrupted; a partial cycle leaves the previous",
    "calibration in place and reports success anyway, which is the single most common reason a meter",
    "returns from service still reading high. On firmware earlier than 2.6 the ring pulses amber rather",
    "than green for the first second, which is normal and is not the amber flicker described below.",
    "If the room is loud enough that the button click is inaudible, watch the ring rather than listening:",
    "the audible feedback is a convenience, not the signal, and several field reports of failed cycles",
    "have turned out to be engineers releasing the button early because they could not hear it.",
  ].join(" "),
});

test.describe("the media is genuinely in the file", () => {
  test("video and audio sources are embedded, not referenced", async ({ page }) => {
    await page.goto(MANUAL);

    const locator = page.locator("video source, audio source");
    // Retried rather than snapshotted: a one-shot evaluateAll races the parser
    // on a file this size in at least one engine.
    await expect(locator).toHaveCount(4);

    const sources = await locator.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLSourceElement).src.slice(0, 24)),
    );

    for (const source of sources) expect(source.startsWith("data:")).toBe(true);
  });

  test("opening the document and playing its media contacts nothing", async ({ page }) => {
    const escaped: string[] = [];
    page.on("request", (request: Request) => {
      const url = request.url();
      if (!url.startsWith("file://") && !url.startsWith("data:") && !url.startsWith("blob:")) escaped.push(url);
    });

    // Both elements declare preload="metadata", so navigating is enough to make
    // the browser reach for the media. Calling load() explicitly is not: it
    // hangs in one engine for reasons tracked in t-020, and would be testing
    // that engine rather than the document.
    // domcontentloaded, not load: waiting for the load event means waiting for
    // both media streams to finish decoding, which is slow enough on a heavy
    // document to eat the whole test budget - and is not what this asserts.
    await page.goto(MANUAL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    expect(escaped).toEqual([]);
  });
});

test.describe("the media plays from a local file", () => {
  for (const kind of ["video", "audio"] as const) {
    test(`the ${kind} plays`, async ({ page, browserName }) => {
      // Playwright's WebKit build ships without media codecs on non-Apple
      // platforms. Verified rather than assumed: the same file fails to decode
      // in that build when loaded straight from file://, so it is the engine
      // build and not the document or its data: URLs. Real Safari plays both.
      test.skip(browserName === "webkit", "Playwright WebKit has no media codecs on this platform.");

      await page.goto(MANUAL);
      const element = page.locator(kind);

      // Ask for playback rather than waiting for the browser to preload.
      // preload is a hint the specification explicitly lets a user agent
      // ignore, so requiring eager metadata would be testing something the web
      // platform never promised - and would fail a document that is perfectly
      // fine. The click is a trusted one against a button the test injects, so
      // this is real user activation and no test UI reaches the document.
      await playViaUserGesture(page, kind);

      await expect
        .poll(async () => element.evaluate((node) => (node as HTMLMediaElement).currentTime), { timeout: 15000 })
        .toBeGreaterThan(0);

      const state = await element.evaluate((node) => {
        const media = node as HTMLMediaElement;
        return { duration: media.duration, currentSrc: media.currentSrc.slice(0, 11), paused: media.paused };
      });

      expect(state.duration).toBeGreaterThan(1);
      expect(state.currentSrc).toBe("data:" + kind + "/");
      expect(state.paused).toBe(false);
    });
  }
});

test.describe("the media participates in flow", () => {
  test("does not break out of its column at any width", async ({ page }) => {
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(MANUAL);
      // Wait for the element rather than assuming navigation implies parsed:
      // at this size one engine resolves goto before the media element exists.
      await page.locator("video").waitFor();

      const measurements = await page.evaluate(() => {
        const video = document.querySelector("video")!.getBoundingClientRect();
        const step = document.querySelector("frwd-video")!.getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          videoWidth: video.width,
          containerWidth: step.width,
          videoHeight: video.height,
        };
      });

      expect(measurements.overflow, `overflow at ${width}px`).toBeLessThanOrEqual(1);
      expect(measurements.videoWidth, `video width at ${width}px`).toBeLessThanOrEqual(
        measurements.containerWidth + 1,
      );
      expect(measurements.videoHeight, `video height at ${width}px`).toBeGreaterThan(0);
    }
  });

  test("moves down naturally when prose is added above it", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });

    await page.goto(MANUAL);
    const before = await page.evaluate(() => ({
      video: document.querySelector("frwd-video")!.getBoundingClientRect().top + window.scrollY,
      width: document.querySelector("video")!.getBoundingClientRect().width,
      audio: document.querySelector("frwd-audio")!.getBoundingClientRect().top + window.scrollY,
    }));

    await page.goto(EDITED);
    const after = await page.evaluate(() => ({
      video: document.querySelector("frwd-video")!.getBoundingClientRect().top + window.scrollY,
      width: document.querySelector("video")!.getBoundingClientRect().width,
      audio: document.querySelector("frwd-audio")!.getBoundingClientRect().top + window.scrollY,
    }));

    // The video and everything after it move down; the video is not resized,
    // and nobody repositioned anything.
    expect(after.video).toBeGreaterThan(before.video);
    expect(after.audio).toBeGreaterThan(before.audio);
    expect(after.width).toBeCloseTo(before.width, 0);
  });

  test("stays usable at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(MANUAL);

    await expect(page.locator("video")).toBeVisible();
    await expect(page.locator("audio")).toBeVisible();
    await expect(page.locator(".gallery img")).toHaveCount(3);
    await expect(page.getByText("Isolate before you open")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("print keeps a meaningful representation", () => {
  test("substitutes a still for the video and a description for the audio", async ({ page }) => {
    await page.goto(MANUAL);

    const substitutes = page.locator(".print-substitute");
    await expect(substitutes.first()).toBeHidden();

    await page.emulateMedia({ media: "print" });

    await expect(page.locator("video")).toBeHidden();
    await expect(page.locator("audio")).toBeHidden();

    // Not omitted: a poster still and a written description of the tone.
    await expect(page.locator(".print-substitute img")).toBeVisible();
    await expect(page.getByText("Reference tone: 520 Hz")).toBeVisible();

    // The captions that explain both remain.
    await expect(page.getByText("The settling cycle, in real time.")).toBeVisible();
    await expect(page.locator(".gallery img")).toHaveCount(3);
  });

  test("keeps the whole procedure on paper", async ({ page }) => {
    await page.goto(MANUAL);
    await page.emulateMedia({ media: "print" });

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".steps > li")).toHaveCount(5);
    await expect(page.getByText("Isolate before you open")).toBeVisible();
    await expect(page.getByText("Code 33 is the only one")).toBeVisible();
    await expect(page.locator("[data-frwd-disclosure-toggle]")).toBeHidden();
  });
});
