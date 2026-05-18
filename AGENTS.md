# Repository Guidelines

## Project Structure & Module Organization

This is a Vite, React, and TypeScript CMS for building college recognition program documents. Application code lives in `src/`: `App.tsx` owns the main workflow, `components/` contains feature UI, `components/ui/` contains reusable Radix/shadcn-style primitives, `lib/` contains rendering, storage, import/export, layout, and Supabase helpers, and `types/` holds shared CMS types. Static assets are in `public/`, including `favicon.svg` and `icons.svg`. Supabase schema changes live in `supabase/migrations/`. Build output is generated in `dist/` and should not be edited directly.

## Build, Test, and Development Commands

- `npm run dev`: start the Vite development server with HMR.
- `npm run build`: run TypeScript project builds, then create the production Vite bundle.
- `npm run lint`: run ESLint across the repository.
- `npm run preview`: serve the production build locally for inspection.

Run `npm install` after dependency changes. The app expects Supabase credentials in `.env.local`; copy `.env.example` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing style: two-space indentation, single quotes, no semicolons, and path alias imports from `@/` for `src` modules. Name React components and exported types in `PascalCase`; name hooks, helpers, and local variables in `camelCase`. Keep UI primitives in `src/components/ui/` and feature-specific components in `src/components/`. Prefer existing helpers such as `cn`, storage utilities, and layout functions before adding new abstractions.

## Testing Guidelines

There is currently no automated test script or test framework configured. Before opening a PR, run `npm run lint` and `npm run build`. For UI changes, verify core flows manually in `npm run dev`: editing pages, drag-and-drop ordering, import/export, PDF/SVG export, and Supabase save/load behavior where applicable. If adding tests, colocate them near the feature or use a clear `src/**/__tests__/` convention and add the matching npm script.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `refactor:`, and `style:`. Keep messages imperative and scoped to one change, for example `fix: render page border above preview content`. Pull requests should include a concise description, validation steps, linked issue when relevant, and screenshots or screen recordings for visible UI changes.

## Security & Configuration Tips

Never commit real Supabase secrets or service role keys. Browser code must only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Review new SQL in `supabase/migrations/` for row-level security and data access assumptions before merging.
