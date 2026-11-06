# Decisions

- sql.js, serialized worker, exact BigInt intermediates, synchronous durable replacement; no debounce of business writes. Keep engine unless measured performance and a verified Windows native alternative justify migration. Benchmark gate results are evidence, not a claim of Windows readiness.
- CommonJS JavaScript, JSDoc/schema contract boundary; node:test. Papa Parse, read-excel-file with exact number strings, bounded XLSX preflight. ExcelJS dependency reserved for unfinished export.
- All legacy fixtures retained unchanged in calculation-vectors and legacy-0.1.0. Complete responses are engine fixtures. Original numerical expectations verified by generator; no production demo assumptions.
- Shared Windows login is not an adversarial OS boundary. Manager API controls cannot prevent a person with filesystem/debugger access from reading/modifying unencrypted SQLite. Hash chain is not an externally trusted signature.
- Simple Crockford base32 HMAC license, four-character tag/random/check blocks. Secret supplied by Petra at build time, necessarily recoverable from a determined reverse engineer. License code also resets PIN, so protect it like a credential. No development bypass exists. Build config marks release at build time. License reveal/OS encryption unfinished.
- No Lite migration. Versioned migrations apply only to PetraDMS databases. User-requested source changes after the original handoff are recorded in CHANGELOG.md.
- Latest steering prioritized v0.1 input compatibility and explicit UNSUPPORTED stubs over completing all modules. Internal approved v0.2 work was preserved instead of silently discarded. Compatibility limits are listed in FRONTEND_INTEGRATION.md.
- No frontend code was reused or modified. renderer is only the requested placeholder.
