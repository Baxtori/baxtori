"use client";

export function LoadingShell() {
  return (
    <main className="auth-shell" aria-busy="true">
      <div className="auth-brand"><span className="brand-mark" aria-hidden="true">B</span><strong>Baxtori</strong></div>
      <p>Opening your code backstory…</p>
    </main>
  );
}

export function SignedOutShell({ configured, authMessage, onExploreDemo }: {
  configured: boolean;
  authMessage: string;
  onExploreDemo: () => void;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">B</span><strong>Baxtori</strong></div>
        <span className="auth-kicker">A living memory for your code</span>
        <h1 id="auth-heading">Understand what you&apos;re becoming.</h1>
        <p>Baxtori turns repository activity into a calm, evidence-backed practice: what deserves attention now, how the system fits together, and which questions should survive the week.</p>
        {configured && (
          <a className="github-button" href="/api/auth/github/start">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.24c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.29-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.11c.98 0 1.95.13 2.87.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.15v3.27c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>
            Continue with GitHub
          </a>
        )}
        <button className="demo-button" onClick={onExploreDemo} type="button">
          Explore the published review <span aria-hidden="true">→</span>
        </button>
        <p className="demo-note">No account required. The demo uses real Baxtori editions and a read-only evidence allowlist.</p>
        {!configured && <p className="connection-caption">Connect your own repositories when GitHub App credentials are configured for this deployment.</p>}
        {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
        <div className="auth-assurances"><span>Read-only repository access</span><span>You choose the repositories</span><span>No email or notification feed</span></div>
      </section>
    </main>
  );
}
