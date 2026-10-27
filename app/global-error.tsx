"use client";

// Last-resort boundary (errors in the root layout itself). It replaces the
// whole document, so it can't rely on the app's CSS — styles are inline.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8f9fc", color: "#0b0e1a" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#64748b", maxWidth: 420 }}>This is usually a brief connection problem. Please try again.</p>
          <button
            onClick={() => (reset(), window.location.reload())}
            style={{ marginTop: 16, height: 44, padding: "0 24px", borderRadius: 999, border: 0, background: "#6d5ae6", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 24, fontSize: 11, color: "#cbd5e1", fontFamily: "monospace" }}>Ref: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
