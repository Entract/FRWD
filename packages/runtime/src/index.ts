/**
 * @frwd/runtime - the trusted FRWD browser runtime.
 *
 * This is the only script a FRWD publication carries. Documents never contain
 * arbitrary JavaScript; this code is standard, identical across publications,
 * and travels inside the file so an old document never needs a future server to
 * obtain its runtime.
 *
 * Three constraints shape everything here:
 *
 * - **No dependencies, no framework, no network.** The runtime touches
 *   `document` and `window` and nothing else. There is no code path that can
 *   fetch, so a publication cannot phone home however it is opened.
 * - **The document already works.** Every publication is readable with
 *   JavaScript disabled; the runtime only adds behaviour on top of markup that
 *   already says the right thing.
 * - **It ships as source.** `RUNTIME_SOURCE` is this function's own text, so
 *   the code embedded in a publication is exactly the code that was reviewed
 *   and tested - not a bundler's rendering of it. Anyone can read what they
 *   have been sent.
 *
 * Editing is deliberately absent in 0.1. It arrives with the reference editor.
 */

export const RUNTIME_VERSION = "0.1.0";

/**
 * Install the runtime into a document.
 *
 * Must stay entirely self-contained: it is serialized by `toString()`, so a
 * reference to anything outside its own body would arrive at a browser as an
 * undefined identifier. That constraint is also the reason the "no
 * dependencies" rule cannot quietly erode.
 */
export function installFrwdRuntime(): void {
  var root = document.documentElement;
  if (root.getAttribute("data-frwd-runtime") === "active") return;

  /** Rich components whose static fallback is already the whole story. */
  var STATIC_COMPONENTS = [
    "frwd-callout",
    "frwd-chart",
    "frwd-dataset",
    "frwd-gallery",
    "frwd-video",
    "frwd-audio",
    "frwd-page-break",
  ];

  function hydrateDisclosure(element: Element): void {
    // Native <details> already does this; only a hand-built disclosure needs
    // wiring, and it must be readable when this never runs.
    if (element.querySelector("details")) return;

    const toggle = element.querySelector("[data-frwd-disclosure-toggle]");
    const body = element.querySelector("[data-frwd-disclosure-body]");
    if (!toggle || !body) return;

    var expanded = element.getAttribute("data-frwd-expanded") === "true";
    var render = function (): void {
      element.setAttribute("data-frwd-expanded", expanded ? "true" : "false");
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (expanded) body.removeAttribute("hidden");
      else body.setAttribute("hidden", "");
    };

    toggle.addEventListener("click", function () {
      expanded = !expanded;
      render();
    });
    render();
  }

  function hydrate(element: Element): void {
    if (element.hasAttribute("data-frwd-hydrated")) return;
    var name = element.tagName.toLowerCase();

    if (name === "frwd-disclosure") {
      hydrateDisclosure(element);
      element.setAttribute("data-frwd-hydrated", "interactive");
      return;
    }

    if (STATIC_COMPONENTS.indexOf(name) !== -1) {
      // Marked, not changed. The fallback content is the component until a
      // later runtime has something better to offer, and marking it lets CSS
      // and tests tell hydrated from unhydrated without guessing.
      element.setAttribute("data-frwd-hydrated", "static");
      return;
    }

    // An unknown frwd-* element: preserved and left alone (spec section 17).
    element.setAttribute("data-frwd-hydrated", "unknown");
  }

  function hydrateAll(): void {
    var elements = document.querySelectorAll("*");
    for (var index = 0; index < elements.length; index++) {
      var element = elements[index];
      if (element && element.tagName.toLowerCase().indexOf("frwd-") === 0) hydrate(element);
    }
  }

  function start(): void {
    hydrateAll();
    root.setAttribute("data-frwd-runtime", "active");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}

/**
 * The runtime as it is embedded in a publication.
 *
 * Derived from the function above rather than maintained separately, so what
 * ships is what was tested. Readable and unminified by intent: a document you
 * were sent should be a document you can read, script included.
 */
export const RUNTIME_SOURCE = `/* FRWD runtime ${RUNTIME_VERSION} - Apache-2.0 - github.com/Entract/FRWD */
(${installFrwdRuntime.toString()})();
`;

/**
 * Runtime stylesheet.
 *
 * Deliberately tiny. The document owns its appearance; this only covers states
 * the runtime itself introduces, and keeps runtime chrome out of print.
 *
 * Print expansion lives here rather than in the script above, and that is a
 * correctness decision rather than a stylistic one. A publication must print
 * with JavaScript disabled, so collapsed substantive content has to be revealed
 * by CSS - a `beforeprint` handler would drop it from exactly the printouts
 * nobody can debug. It also removes any dependence on which engines fire which
 * print events.
 */
export const RUNTIME_STYLE = `[data-frwd-disclosure-body][hidden] { display: none; }

@media print {
  [data-frwd-runtime-chrome] { display: none !important; }

  /* Nothing substantive may disappear from a printout, whether or not the
     runtime ever ran: a reader holding paper cannot expand anything. */
  [data-frwd-disclosure-body][hidden] { display: block !important; }

  /* Best effort for native <details>, which no CSS can force open in every
     engine: ::details-content covers Chromium and Firefox, WebKit has no
     equivalent. Substantive collapsed content therefore belongs in a
     frwd-disclosure, or in <details open>. */
  details:not([open])::details-content { content-visibility: visible !important; }
  details > *:not(summary) { display: block !important; }
}
`;
