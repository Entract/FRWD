/**
 * Inline documents for unit tests.
 *
 * The real reference fixtures live in `fixtures/` at the repository root and
 * arrive with the conformance harness. These are deliberately tiny: each one
 * isolates a single property so a failure names its own cause.
 */

export const DOCUMENT_ID = "550e8400-e29b-41d4-a716-446655440000";

/** A small but complete, conforming FRWD 0.1 document. */
export const MINIMAL = `<!doctype html>
<html lang="en" data-frwd-version="0.1">
<head>
<meta charset="utf-8">
<meta name="generator" content="FRWD">
<meta name="frwd-document-id" content="${DOCUMENT_ID}">
<title>Minimal FRWD</title>
<script type="application/frwd+json" id="frwd-manifest">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${DOCUMENT_ID}",
  "title": "Minimal FRWD",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"
}
</script>
<style id="frwd-document-style">
:root { color-scheme: light dark; }
main { max-width: 34rem; }
</style>
</head>
<body>
<main data-frwd-document>
<article data-frwd-id="11111111-1111-4111-8111-111111111111">
<h1 data-frwd-id="22222222-2222-4222-8222-222222222222">Minimal FRWD</h1>
<p data-frwd-id="33333333-3333-4333-8333-333333333333">Flow &amp; reflow, in one file.</p>
</article>
</main>
</body>
</html>
`;

/** Blocks with no stable ids, for exercising id assignment. */
export const WITHOUT_IDS = `<!doctype html>
<html lang="en" data-frwd-version="0.1">
<head>
<meta charset="utf-8">
<title>No ids</title>
<script type="application/frwd+json" id="frwd-manifest">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${DOCUMENT_ID}",
  "title": "No ids",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"
}
</script>
</head>
<body>
<main data-frwd-document>
<article>
<h1>No ids</h1>
<p>First.</p>
<p data-frwd-id="keep-me">Already identified.</p>
</article>
</main>
</body>
</html>
`;

/** A document carrying asset metadata. */
export const WITH_ASSET = `<!doctype html>
<html lang="en" data-frwd-version="0.1">
<head>
<meta charset="utf-8">
<title>Asset</title>
<script type="application/frwd+json" id="frwd-manifest">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${DOCUMENT_ID}",
  "title": "Asset",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"
}
</script>
<script type="application/frwd-asset+json" data-frwd-asset-id="asset-123">
{
  "id": "asset-123",
  "mediaType": "video/mp4",
  "bytes": 18422312,
  "sha256": "abc",
  "title": "Introduction"
}
</script>
</head>
<body>
<main data-frwd-document>
<article data-frwd-id="11111111-1111-4111-8111-111111111111">
<p data-frwd-id="33333333-3333-4333-8333-333333333333">See the video.</p>
</article>
</main>
</body>
</html>
`;

/** Returns a counter-based id factory so assignment is reproducible. */
export function sequentialIds(prefix = "id"): () => string {
  let next = 0;
  return () => `${prefix}-${++next}`;
}
