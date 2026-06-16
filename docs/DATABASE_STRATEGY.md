# Database Strategy: Supabase JS (Primary) vs Prisma (Legacy)

## Current State

The project has **two** database clients configured:

| File | Client | Used By |
|------|--------|---------|
| `src/lib/supabase.ts` | `@supabase/supabase-js` | All API routes, all auth, all components |
| `src/lib/db.ts` | `@prisma/client` | **Nothing in the runtime codebase** |

A search of `src/` confirms Prisma is **not actually imported anywhere** in the application code.
It exists as a development-time tool only:

- `prisma/schema.prisma` — used as the source of truth for schema documentation
- `prisma db push` / `prisma migrate dev` — used by developers to apply schema changes
- The actual production runtime uses Supabase JS exclusively

## Recommendation: Keep Both, With Clear Boundaries

Rather than rip out Prisma (which would require migrating the schema documentation), we recommend:

### Prisma — Schema Authoring & Migrations Only
- ✅ `prisma/schema.prisma` remains the canonical schema definition
- ✅ `bun run db:push` for development schema sync
- ✅ `bun run db:migrate` for production migrations
- ❌ Never import `@prisma/client` in `src/` runtime code
- ❌ Never instantiate a Prisma client at runtime

### Supabase JS — All Runtime Data Access
- ✅ All API routes use `getServerClient()` from `src/lib/supabase.ts`
- ✅ Service role key bypasses RLS for trusted server-side operations
- ✅ Anon key (browser client) is subject to the locked-down RLS policies
- ❌ Don't mix Prisma writes with Supabase reads on the same table

## Why Not Migrate Fully to Prisma?

Prisma offers better TypeScript inference and a query builder, but switching would mean:

1. Losing Supabase Auth (if added later), Supabase Storage, Supabase Realtime
2. Losing RLS — Prisma can't enforce row-level security
3. Writing our own session/auth/storage layers
4. Migration cost: ~30 API routes to rewrite

## Why Not Migrate Fully to Supabase JS?

Supabase JS doesn't have:
- A schema definition file (that's why we keep `prisma/schema.prisma`)
- A migration tool (that's why we use `prisma migrate`)
- Strong typing without manual `Database` interface definitions

## Action Items

1. **Type the Supabase client** — Define a `Database` interface (see Supabase docs:
   https://supabase.com/docs/guides/api/rest/generating-types) and pass it as a generic
   to `createClient<Database>(...)`. This unlocks autocomplete on `.from('Table')` calls
   and lets us remove `typescript.ignoreBuildErrors: true` from `next.config.ts`.

2. **Delete `src/lib/db.ts`** — It's dead code. Verify with `rg "@prisma/client" src/`
   returns zero results, then remove the file. (Currently it might still be referenced
   by a stale import — check before deleting.)

3. **Document this strategy in CONTRIBUTING.md** — So future developers don't accidentally
   import Prisma in runtime code.
