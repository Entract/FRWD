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

  /**
   * Print expands disclosures, then puts them back.
   *
   * A reader holding a printout cannot click anything, so collapsed content
   * would simply be missing - and a component that silently disappears from
   * print is exactly what the rich-media contract forbids.
   */
  function installPrintHandlers(): void {
    var reopened: Element[] = [];

    var expand = function (): void {
      reopened = [];
      var details = document.querySelectorAll("details");
      for (var index = 0; index < details.length; index++) {
        var element = details[index];
        if (element && !element.hasAttribute("open")) {
          element.setAttribute("open", "");
          reopened.push(element);
        }
      }

      var disclosures = document.querySelectorAll("frwd-disclosure");
      for (var index2 = 0; index2 < disclosures.length; index2++) {
        var disclosure = disclosures[index2];
        if (!disclosure) continue;
        var body = disclosure.querySelector("[data-frwd-disclosure-body]");
        if (body && body.hasAttribute("hidden")) {
          body.removeAttribute("hidden");
          reopened.push(body);
        }
      }
    };

    var restore = function (): void {
      for (var index = 0; index < reopened.length; index++) {
        var element = reopened[index];
        if (!element) continue;
        if (element.tagName.toLowerCase() === "details") element.removeAttribute("open");
        else element.setAttribute("hidden", "");
      }
      reopened = [];
    };

    if (typeof window.matchMedia === "function") {
      var query = window.matchMedia("print");
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", function (event) {
          if ((event as MediaQueryListEvent).matches) expand();
          else restore();
        });
      }
    }

    window.addEventListener("beforeprint", expand);
    window.addEventListener("afterprint", restore);
  }

  function start(): void {
    hydrateAll();
    installPrintHandlers();
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
 */
export const RUNTIME_STYLE = `[data-frwd-disclosure-body][hidden] { display: none; }
@media print {
  [data-frwd-runtime-chrome] { display: none !important; }
}
`;
