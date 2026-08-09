import { expect, test } from "@playwright/test";
import { publishFixture } from "./support/publications.js";

/**
 * The manual with JavaScript disabled.
 *
 * Media in a FRWD is browser-native, not runtime-driven, so switching scripting
 * off should cost nothing except the FRWD disclosure's toggle.
 */

const MANUAL = publishFixture("rich-manual/field-calibration");

test("the video keeps its poster, controls and caption", async ({ page }) => {
  await page.goto(MANUAL);

  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("controls", "");
  expect(await video.getAttribute("poster")).toMatch(/^data:image\//);

  await expect(page.getByText("The settling cycle, in real time.")).toBeVisible();
});

test("the audio keeps its controls and its written description", async ({ page }) => {
  await page.goto(MANUAL);

  await expect(page.locator("audio")).toBeVisible();
  await expect(page.getByText("Reference tone, 520 Hz.")).toBeVisible();
});

test("the gallery and the safety note are unaffected", async ({ page }) => {
  await page.goto(MANUAL);

  await expect(page.locator(".gallery img")).toHaveCount(3);
  await expect(page.getByText("Isolate before you open")).toBeVisible();
  await expect(page.getByText("under-tightened, over-tightened")).toBeVisible();
});

test("the whole procedure is still readable", async ({ page }) => {
  await page.goto(MANUAL);

  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".steps > li")).toHaveCount(5);
  await expect(page.getByText("Record the standing reading")).toBeVisible();
});

test("print substitutes still appear with no script at all", async ({ page }) => {
  await page.goto(MANUAL);
  await page.emulateMedia({ media: "print" });

  await expect(page.locator(".print-substitute img")).toBeVisible();
  await expect(page.getByText("Reference tone: 520 Hz")).toBeVisible();
  await expect(page.getByText("Code 33 is the only one")).toBeVisible();
});
