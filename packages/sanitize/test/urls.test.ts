import { describe, expect, it } from "vitest";
import { classifyUrl, isExecutableDataUrl, parseSrcset, requiresNetworkOrExternalFile } from "../src/index.js";

describe("classifyUrl", () => {
  it("recognizes the harmless kinds", () => {
    expect(classifyUrl("#section-3").kind).toBe("fragment");
    expect(classifyUrl("   ").kind).toBe("empty");
    expect(classifyUrl("").kind).toBe("empty");
  });

  it("treats a relative reference as external, because the file does not contain it", () => {
    expect(classifyUrl("assets/logo.png").kind).toBe("relative");
    expect(classifyUrl("/assets/logo.png").kind).toBe("relative");
    expect(requiresNetworkOrExternalFile(classifyUrl("assets/logo.png"))).toBe(true);
  });

  it("recognizes remote references, including protocol-relative ones", () => {
    expect(classifyUrl("https://example.invalid/x").kind).toBe("remote");
    expect(classifyUrl("http://example.invalid/x").kind).toBe("remote");
    expect(classifyUrl("//example.invalid/x").kind).toBe("remote");
  });

  it("recognizes executable schemes however they are dressed up", () => {
    expect(classifyUrl("javascript:alert(1)").kind).toBe("executable");
    expect(classifyUrl("JavaScript:alert(1)").kind).toBe("executable");
    expect(classifyUrl("  javascript:alert(1)  ").kind).toBe("executable");
    expect(classifyUrl("vbscript:msgbox").kind).toBe("executable");
  });

  it("sees through control characters inside the scheme", () => {
    // Browsers strip tab, newline and carriage return from a URL before
    // parsing it, so `java\nscript:` runs. A prefix check would miss this.
    expect(classifyUrl("java\nscript:alert(1)").kind).toBe("executable");
    expect(classifyUrl("java\tscript:alert(1)").kind).toBe("executable");
    expect(classifyUrl("java\r\nscript:alert(1)").kind).toBe("executable");
  });

  it("rejects schemes that cannot resolve in a portable document", () => {
    expect(classifyUrl("blob:https://example.invalid/abc").kind).toBe("opaque");
    expect(classifyUrl("filesystem:https://example.invalid/x").kind).toBe("opaque");
  });

  it("passes through other schemes without alarm", () => {
    expect(classifyUrl("mailto:someone@example.invalid").kind).toBe("other-scheme");
    expect(classifyUrl("tel:+441234567890").kind).toBe("other-scheme");
  });

  it("describes a data URL", () => {
    const url = classifyUrl("data:image/webp;base64,AAAA");
    expect(url.kind).toBe("data");
    expect(url.mediaType).toBe("image/webp");
    expect(url.bytes).toBe(3);
  });

  it("defaults a data URL with no media type to text/plain", () => {
    expect(classifyUrl("data:,hello").mediaType).toBe("text/plain");
  });

  it("measures a base64 payload, allowing for padding", () => {
    expect(classifyUrl("data:application/octet-stream;base64,AAAA").bytes).toBe(3);
    expect(classifyUrl("data:application/octet-stream;base64,AAA=").bytes).toBe(2);
    expect(classifyUrl("data:application/octet-stream;base64,AA==").bytes).toBe(1);
  });

  it("knows which data URLs are programs", () => {
    expect(isExecutableDataUrl(classifyUrl("data:text/html,<script>x</script>"))).toBe(true);
    expect(isExecutableDataUrl(classifyUrl("data:application/javascript,x"))).toBe(true);
    expect(isExecutableDataUrl(classifyUrl("data:image/png;base64,AAAA"))).toBe(false);
  });

  it("does not flag a self-contained data URL as external", () => {
    expect(requiresNetworkOrExternalFile(classifyUrl("data:image/png;base64,AAAA"))).toBe(false);
    expect(requiresNetworkOrExternalFile(classifyUrl("#anchor"))).toBe(false);
  });
});

describe("parseSrcset", () => {
  it("splits candidates and drops descriptors", () => {
    expect(parseSrcset("a.png 1x, b.png 2x")).toEqual(["a.png", "b.png"]);
    expect(parseSrcset("a.png 400w,\n  b.png 800w")).toEqual(["a.png", "b.png"]);
  });

  it("survives data URLs, which contain commas of their own", () => {
    expect(parseSrcset("data:image/png;base64,AAAA 1x, https://example.invalid/b.png 2x")).toEqual([
      "data:image/png;base64,AAAA",
      "https://example.invalid/b.png",
    ]);
  });

  it("handles a single candidate with no descriptor", () => {
    expect(parseSrcset("only.png")).toEqual(["only.png"]);
  });
});
