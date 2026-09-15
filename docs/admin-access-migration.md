# Migrating Env-Var Admins to Firestore

Why this exists: `ADMIN_EMAILS`/`ADMIN_EMAILS_<AREA>` (`lib/firebase/admin-auth.ts:43-53`) grant admin
access as a fallback when someone has no `adminUsers` Firestore doc. It's a useful bootstrap/
break-glass mechanism, but it has one real downside — it **can't be revoked** through the app's own
tooling (removing someone requires editing and redeploying an env var). A proper `adminUsers` doc,
created through `/admin/access`, can be disabled or removed instantly by any superadmin, is scoped
to specific areas, and shows up in the audit log. This walks through moving every current env-var
admin onto a real record, then trimming the env vars down to a single emergency account.

## Before you start

Check your Vercel project's **Settings → Environment Variables** for the current live values of
`ADMIN_EMAILS` and every `ADMIN_EMAILS_<AREA>` (announcements, applications, inquiries, parents,
events, reports, dashboard, payments, staff, blog, gallery, testimonials, faqs, subscribers) — this
repo has no way to read those values, only you can see them. Write down each distinct email and
which access it currently implies:

- Listed in `ADMIN_EMAILS` → superadmin (full access to every area, including managing other
  admins).
- Listed in one or more `ADMIN_EMAILS_<AREA>` → access to just those areas.

## Migrating each admin

You'll need to already be signed in as a superadmin (via the env var or an existing `adminUsers`
doc — either works) to do this, since `/admin/access` requires superadmin access.

For each person on your list:

1. Go to **/admin/access** and use the "Create Admin" form.
2. Enter their real display name and the **exact email** they currently use to log in.
3. Check "Superadmin" if they're in `ADMIN_EMAILS`, or otherwise check the specific areas matching
   their `ADMIN_EMAILS_<AREA>` entries.
4. Submit. Because this email already has a Firebase Auth account (that's how they're logging in
   today), the API adopts the existing account into a new `adminUsers` record rather than creating
   a second one — you'll see a banner confirming this and explaining that their login is unchanged
   and no email was sent to them. (If you instead see "This user is already an admin", they already
   have an active record — nothing more to do for that person.)
5. Confirm they now appear correctly in the admin list below the form, with the right areas/
   superadmin flag.

Repeat for everyone on your list. Nothing about how they log in changes at any point in this
process — their password and session are untouched. What changes is only *where* their
authorization comes from: once they have an `adminUsers` doc, that record — not the env var —
becomes their access, immediately (see `resolveAdminIdentity` in `admin-auth.ts`: the Firestore doc
is checked first, before ever falling back to the env vars).

## After everyone is migrated

Once every real admin has a proper Firestore record (verify the full list under **/admin/access**
matches your written-down roster from before):

1. In Vercel, trim `ADMIN_EMAILS` down to **one** trusted account — kept deliberately as a
   break-glass path in case Firestore or the admin-access tooling itself is ever broken. Document
   who holds this account and why outside the codebase (e.g. in your own internal notes) — this
   repo intentionally doesn't track who your admins are.
2. Remove every `ADMIN_EMAILS_<AREA>` var entirely — once everyone has a real Firestore record,
   these have no one left relying on them.
3. Redeploy so the env var changes take effect.

## If you need to add a break-glass admin later

The one remaining `ADMIN_EMAILS` account is meant for emergencies only — logging in when Firestore
itself is unreachable, for example. It's not revocable through the app (that's the tradeoff for it
working even when Firestore is down), so keep it to a single, well-protected account, and prefer
creating a proper `adminUsers` record via `/admin/access` for anyone who needs ongoing access.
