import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "../brand-mark";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  description: "What Baxtori reads, stores, and deletes when you connect GitHub.",
  title: "Privacy — Baxtori",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/"><BrandMark /><span>Baxtori</span></Link>
        <span>Privacy field note · July 2026</span>
      </header>

      <article className={styles.article}>
        <p className={styles.kicker}>A small, read-only footprint</p>
        <h1>Your repositories remain yours.</h1>
        <p className={styles.dek}>Baxtori connects to GitHub to help you remember consequential changes. It does not ask for write access, and the hosted app does not run a model over your private source code.</p>

        <section>
          <h2>What GitHub shares</h2>
          <p>You choose which repositories the GitHub App may read. Baxtori requests read-only Contents and Metadata permissions. GitHub access and refresh tokens stay encrypted in an HttpOnly browser cookie; they are not stored in browser JavaScript or the account database.</p>
        </section>

        <section>
          <h2>What Baxtori stores</h2>
          <p>Your numeric GitHub user ID, login, repository inventory metadata, source modes, reading state, questions, watched topics, and requested re-reviews. Repository inventory metadata includes names, visibility, language, default branch, and activity timestamps.</p>
        </section>

        <section>
          <h2>What it does not store</h2>
          <p>The account store does not copy repository files, diffs, GitHub credentials, or private source code. Exact source and diff views are fetched from GitHub when you request them. Published example editions are public files in the Baxtori repository.</p>
        </section>

        <section>
          <h2>Codex and compilation</h2>
          <p>The public demo is compiled by the project owner&apos;s local Codex automation. Connecting GitHub does not spend the owner&apos;s Codex account on your repositories and does not start a private compilation job. Any future per-account compiler will require an explicit cost and consent model.</p>
        </section>

        <section>
          <h2>Your controls</h2>
          <p>From Sources, you can download the account record Baxtori holds or permanently delete it. Deletion removes reader state, questions, watches, review requests, and repository inventory. It also signs this browser out. GitHub App installation access is managed separately in GitHub settings.</p>
        </section>

        <footer>
          <Link href="/">Return to the journal</Link>
          <a href="https://github.com/teamleaderleo/baxtori" rel="noreferrer" target="_blank">Inspect the source ↗</a>
        </footer>
      </article>
    </main>
  );
}
