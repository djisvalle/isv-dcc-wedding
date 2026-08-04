/**
 * Bootstrap admins: signing in with one of these emails auto-creates an
 * `admins/{uid}` doc on first login (see AdminLogin.tsx), after which the
 * Firestore `admins` collection is the source of truth. This list is a
 * convenience for onboarding, not the security boundary.
 *
 * The actual boundary is `firestore.rules`' `isAdmin()`, which keeps its own
 * copy of this same list (rules can't import TS) — keep the two in sync by
 * hand when adding or removing an admin.
 */
export const BOOTSTRAP_ADMIN_EMAILS: readonly string[] = [
  'israelvalle48@gmail.com',
  'debcarumba@gmail.com',
  'joshj.alzate77@gmail.com',
];
