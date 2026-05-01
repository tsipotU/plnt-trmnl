/* Auth recovery CLI for self-hosters.
 *
 * Resets the admin password and clears all sessions. Use when:
 *   - You forgot the password and there's no email recovery (there isn't).
 *   - The setup token was lost AND `admin_password_hash` was already set.
 *   - You're rotating credentials after a suspected leak.
 *
 * Usage (inside the running container):
 *   docker compose exec plant-api npm run reset-auth
 *
 * Usage (host, with the same DATABASE_PATH env var the API uses):
 *   DATABASE_PATH=/data/plants.db npm --prefix packages/api run reset-auth
 *
 * Non-interactive (CI / scripts):
 *   npm --prefix packages/api run reset-auth -- --password 'new-password-here'
 *
 * The CLI is intentionally separate from the HTTP surface — running it does
 * NOT require the API server to be up. It opens the SQLite file directly.
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import type Database from 'better-sqlite3';
import { createDatabase } from '../database/connection.js';
import { hashPassword } from '../auth/passwords.js';

const MIN_PASSWORD_LEN = 12;

export interface ResetResult {
  passwordSet: boolean;
  sessionsDeleted: number;
}

/* Pure DB operation — used by tests and the CLI alike. Updates (or inserts)
 * the admin_password_hash row in app_state and clears the sessions table.
 * Returns count of sessions deleted so callers can report it. */
export async function resetAuth(
  db: Database.Database,
  newPassword: string,
): Promise<ResetResult> {
  if (newPassword.length < MIN_PASSWORD_LEN) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LEN} characters`);
  }
  const hash = await hashPassword(newPassword);

  // INSERT OR REPLACE handles both "no admin set yet" and "rotate existing".
  db.prepare(
    `INSERT OR REPLACE INTO app_state (key, value, updated_at)
       VALUES ('admin_password_hash', ?, datetime('now'))`,
  ).run(hash);

  const result = db.prepare(`DELETE FROM sessions`).run();

  return {
    passwordSet: true,
    sessionsDeleted: result.changes,
  };
}

interface ParsedArgs {
  password?: string;
  databasePath?: string;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--password' || arg === '-p') args.password = argv[++i];
    else if (arg === '--database' || arg === '-d') args.databasePath = argv[++i];
    else if (arg === '--password-file') args.password = readFileSync(argv[++i], 'utf8').trim();
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

async function promptPassword(): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const pw1 = await rl.question('New admin password (≥12 chars): ');
    const pw2 = await rl.question('Confirm: ');
    if (pw1 !== pw2) throw new Error('Passwords do not match');
    return pw1;
  } finally {
    rl.close();
  }
}

const HELP = `Usage: reset-auth [options]

Reset the admin password and clear all sessions.

Options:
  -p, --password <pw>      New password (skips interactive prompt)
      --password-file <f>  Read password from a file (first line, trimmed)
  -d, --database <path>    Path to plants.db (overrides DATABASE_PATH env)
  -h, --help               Show this help

Examples:
  docker compose exec plant-api npm run reset-auth
  DATABASE_PATH=/data/plants.db npm --prefix packages/api run reset-auth
  npm --prefix packages/api run reset-auth -- --password 'mynewpw1234'
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const dbPath = args.databasePath ?? process.env.DATABASE_PATH;
  if (!dbPath) {
    process.stderr.write(
      'Error: no database path. Set DATABASE_PATH env var or pass --database.\n',
    );
    process.exit(2);
  }

  const password = args.password ?? (await promptPassword());

  const db = createDatabase(dbPath);
  try {
    const result = await resetAuth(db, password);
    process.stdout.write(
      `✓ Password reset. Cleared ${result.sessionsDeleted} session${
        result.sessionsDeleted === 1 ? '' : 's'
      }. Log in at /login with the new password.\n`,
    );
  } finally {
    db.close();
  }
}

// CLI entry — only runs when invoked as `node reset-auth.js`, not on import.
const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  main().catch((err) => {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
