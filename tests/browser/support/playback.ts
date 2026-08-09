import type { Page } from "@playwright/test";

/**
 * Start a media element the way a reader would.
 *
 * `preload` is a hint the HTML specification explicitly permits a user agent to
 * ignore, so a test that waits for metadata to appear on its own is asserting
 * something the web platform never promised. Firefox is entirely within its
 * rights to load nothing until playback is actually requested.
 *
 * So the test asks. A button is injected into the page and clicked by
 * Playwright, which produces a genuinely trusted event and real user
 * activation - the same thing a reader's click produces, and the thing autoplay
 * policies are looking for. The button belongs to the test and never appears in
 * a FRWD document.
 */
export async function playViaUserGesture(page: Page, selector: string): Promise<void> {
  await page.evaluate((target) => {
    const button = document.createElement("button");
    button.id = "test-only-play-trigger";
    button.textContent = "play";
    button.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647";
    button.addEventListener("click", () => {
      const media = document.querySelector(target) as HTMLMediaElement | null;
      if (!media) return;
      // Silent rather than muted: some engines treat a muted element as a
      // different case entirely, and the point is to exercise real playback.
      media.volume = 0;
      void media.play().catch(() => undefined);
    });
    document.body.appendChild(button);
  }, selector);

  await page.click("#test-only-play-trigger");
  await page.evaluate(() => document.getElementById("test-only-play-trigger")?.remove());
}
