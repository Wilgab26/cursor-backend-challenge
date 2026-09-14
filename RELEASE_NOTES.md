# Release Notes - NestJS API Scaffold

## Overview
This release creates a new NestJS API project scaffold using npm in a local workspace.

## What was created
- NestJS project structure under the workspace root
- Basic app entry point in src/main.ts
- App module, controller, and service
- Users module with controller, service, repository, and entity layers
- Swagger/OpenAPI integration for API documentation
- DTOs for create, update, and response payloads in the users module
- npm scripts for build and start
- TypeScript configuration for Node support

## Steps completed
1. Create the project folder and initialize the package manifest.
2. Install NestJS core dependencies with npm.
3. Create the main application files:
   - src/main.ts
   - src/app.module.ts
   - src/app.controller.ts
   - src/app.service.ts
4. Add a users module with a layered structure:
   - src/users/user.entity.ts
   - src/users/users.controller.ts
   - src/users/users.service.ts
   - src/users/users.repository.ts
   - src/users/users.module.ts
5. Configure TypeScript settings for compilation.
6. Add Swagger decorators to the users controller and DTOs for OpenAPI documentation.
7. Verify the app builds successfully.
8. Start the app and confirm the API responds on localhost.

## Run locally
From the project folder, run:

```powershell
npm install
npm run build
npm start
```

Then open:

```text
http://localhost:3001/api
http://localhost:3001/docs
```

## Notes
- The app uses the prefix /api.
- Swagger UI is available at /docs.
- The default response from the starter endpoint is: Hello World!
- The users module exposes the following endpoints:
  - GET /api/users
  - GET /api/users/:id
  - POST /api/users
  - PUT /api/users/:id
  - DELETE /api/users/:id
- Port 3001 is used to avoid conflicts with other local services.

## Next steps
- Add DTOs and validation
- Connect to a database
- Add pagination and search
- Add authentication and authorization

---

# Release Notes - PostgreSQL Persistence

## Overview
This release replaces the in-memory users store with PostgreSQL, using TypeORM, and adds a Docker Compose file to run Postgres locally.

## What was created / changed
- TypeORM + `pg` + `@nestjs/config` added as dependencies (`typeorm` pinned to `^0.3.20` — the current `1.x` line requires Node >=20.19, and this project runs on Node 18.19)
- `src/users/user.entity.ts` converted to a TypeORM entity (`@Entity('users')`, `@PrimaryGeneratedColumn`, `@Column`, unique constraints on `username`/`email`)
- `src/users/users.repository.ts` rewritten to wrap an injected TypeORM `Repository<User>` instead of an in-memory array
- `src/users/users.service.ts` methods converted to `async`/`Promise`-returning to match the repository
- `src/users/users.module.ts` registers the entity via `TypeOrmModule.forFeature([User])`
- `src/app.module.ts` adds `ConfigModule.forRoot({ isGlobal: true })` (loads `.env`) and `TypeOrmModule.forRoot(...)` (Postgres connection config from `DB_*` env vars)
- `docker-compose.yml` added — single `postgres:16-alpine` service with a named volume for persistence
- `.env.example` added, documenting `PORT`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_SYNCHRONIZE`
- `package.json` scripts added: `docker:up` (`docker compose up -d`), `docker:down` (`docker compose down`)

## Steps completed
1. Install `@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/config`.
2. Convert `User` into a TypeORM entity and wire `TypeOrmModule` into `UsersModule`/`AppModule`.
3. Rewrite `UsersRepository` and `UsersService` to use the TypeORM repository instead of the in-memory array.
4. Add `docker-compose.yml` for a local Postgres instance, plus `.env.example`/`.env` for connection settings.
5. Verify the app builds (`npm run build`).
6. Start Postgres via Docker Compose and the app locally; verify a full CRUD cycle (create, get, update, list, delete, 404-after-delete) against the real database, and confirm rows/schema directly via `psql`.

## Run locally
From the project folder:

```powershell
npm install
copy .env.example .env
npm run docker:up
npm run build
npm start
```

Then open:

```text
http://localhost:3001/api
http://localhost:3001/docs
```

Stop the database with `npm run docker:down` when done.

## Notes
- `DB_SYNCHRONIZE=true` (the default) makes TypeORM auto-create/update tables from entity definitions on boot — convenient for local dev, but not meant for production (use migrations and set it to `false` there instead).
- The Docker Postgres container publishes on host port **5433**, not the Postgres default of 5432 — the development machine this was built on already runs a native PostgreSQL Windows service on 5432, which silently intercepted connections meant for the container. If that conflict doesn't apply in a given environment, `DB_PORT` (in `.env` and `docker-compose.yml`) can be changed back to `5432`.
- `UserResponseDto` still includes `password`, and passwords are stored in plain text — no hashing yet.
- There is still no global `ValidationPipe`, so `class-validator` decorators on the DTOs (if added) would not be enforced at runtime.

## Next steps
- Hash passwords before persisting them, and stop returning `password` in API responses
- Add a global `ValidationPipe` and enforce DTOs (rather than `Omit<User, 'id'>` / `Partial<User>`) on controller inputs
- Add TypeORM migrations and turn off `synchronize` outside local dev
- Add pagination and search
- Add authentication and authorization
- Add automated tests (jest is installed but there is no test script, jest config, or `*.spec.ts` file yet)

---

# Release Notes - Held Pokemon List (PokeAPI Integration)

## Overview
This release lets each user hold a list of pokemon. Only PokeAPI pokemon ids are stored in the database; pokemon names are fetched live from [PokeAPI](https://pokeapi.co/api/v2/pokemon/) whenever a user is read back, never persisted.

## What was created / changed
- `src/users/user-pokemon.entity.ts` — new `UserPokemon` join entity (`user_pokemons` table): `id`, `pokemonId`, and a `@ManyToOne` back to `User` (`onDelete: 'CASCADE'`)
- `src/users/user.entity.ts` — added a `@OneToMany(() => UserPokemon, ...)` `pokemons` relation
- `src/users/pokemon-api.client.ts` — new `PokemonApiClient`, a plain injectable (not a service, not its own module, per explicit direction) that calls PokeAPI via Node's built-in `fetch`; `getManyByIds` fetches in parallel and tolerates individual failures (logs a warning, returns `name: 'unknown'` for that entry rather than failing the whole request)
- `src/users/users.repository.ts` — `findAll`/`findById` now eager-load the `pokemons` relation and enrich each held pokemon id with its live name via `PokemonApiClient`, returning a new `UserWithPokemons` shape (`User` with `pokemons: {id, name}[]`); added `addPokemon`/`removePokemon`
- `src/users/users.service.ts` / `users.controller.ts` — added `POST /api/users/:id/pokemons` (body `{ pokemonId }`) and `DELETE /api/users/:id/pokemons/:pokemonId`; `findAll`/`findById` now return the enriched shape
- `src/users/dto/add-pokemon.dto.ts`, `src/users/dto/pokemon-summary.dto.ts` — new DTOs; `UserResponseDto` gained a `pokemons: PokemonSummaryDto[]` field
- `src/users/users.module.ts` / `src/app.module.ts` — registered `UserPokemon` in both the feature module's `TypeOrmModule.forFeature([...])` and the root `TypeOrmModule.forRoot({ entities: [...] })`

## Steps completed
1. Design the join entity and relation, decide (per project owner) that the PokeAPI client is a plain injectable consumed directly by the repository, not a separate service/module.
2. Confirm (via user input) the pokemon assignment API shape: dedicated `POST`/`DELETE` sub-resource endpoints rather than embedding `pokemonIds` in create/update.
3. Implement the entity, client, repository/service/controller changes, and DTOs.
4. Fix a startup crash (`TypeORMError: Entity metadata for User#pokemons was not found`) caused by registering `UserPokemon` in the feature module but not in the root `TypeOrmModule.forRoot` entities list.
5. Verify end-to-end against the real Postgres container and the live PokeAPI: add pikachu (25) and charizard (6) to a user, confirm `GET /users` and `GET /users/:id` return live-fetched names, remove one, confirm it drops from the response, and confirm via `psql` that only `pokemon_id` is stored in `user_pokemons` (no name column).
6. Confirm `POST /users/:id/pokemons` against a non-existent user returns `404`.

## Notes
- Held-pokemon lookups are N live HTTP calls to PokeAPI per request (fetched in parallel) — there is no caching, so response time scales with how many pokemon a user holds and with PokeAPI's latency.
- A failed PokeAPI lookup for a given id does not fail the request; that entry's `name` comes back as `'unknown'` and a warning is logged.
- `DELETE /users/:id/pokemons/:pokemonId` is idempotent — removing a pokemon a user doesn't hold is a no-op, not a 404 (a 404 is only thrown if the user itself doesn't exist).

## Next steps
- Cache PokeAPI responses (in-memory or DB-backed) to avoid re-fetching the same pokemon repeatedly
- Validate `pokemonId` against PokeAPI (or a known range) before insert, rather than discovering an invalid id only when it's read back

---

# Release Notes - Pokemons on Create/Update, Configurable PokeAPI URL

## Overview
This release reverses the prior direction of keeping pokemon assignment to dedicated sub-resource endpoints only: `POST /api/users` and `PUT /api/users/:id` can now set a user's held pokemons directly via a `pokemonIds` field in the request body, alongside the existing `POST/DELETE /api/users/:id/pokemons(/:pokemonId)` endpoints. Separately, the PokeAPI base URL is now configurable via an env var instead of being hardcoded.

## What was created / changed
- `src/users/dto/create-user.dto.ts` — added `pokemonIds: number[]`; `UpdateUserDto` (a `PartialType` of it) inherits the field as optional
- `src/users/users.controller.ts` — `create`/`update` now accept `CreateUserDto`/`UpdateUserDto`, split off `pokemonIds`, and return the enriched `UserWithPokemons` shape instead of the raw `User` entity
- `src/users/users.service.ts` — `create`/`update` forward `pokemonIds` to the repository
- `src/users/users.repository.ts`:
  - `create` saves the user, then bulk-inserts a `UserPokemon` row per id in `pokemonIds`
  - `update` — when `pokemonIds` is present in the call, **replaces** the user's full pokemon set (deletes all existing `user_pokemons` rows for that user, then inserts the new ids); if `pokemonIds` is omitted entirely, existing pokemons are left untouched
- `src/users/pokemon-api.client.ts` — `baseUrl` is now read via injected `ConfigService` (`POKEMON_API_BASE_URL`), falling back to the existing hardcoded PokeAPI URL if unset
- `.env` / `.env.example` — added `POKEMON_API_BASE_URL=https://pokeapi.co/api/v2/pokemon`

## Steps completed
1. Discuss with the project owner whether `pokemons`/`pokemonIds` in `CreateUserDto` should be Swagger-schema-only or actually wired end-to-end; confirmed: wire it up for real.
2. Add `pokemonIds: number[]` to `CreateUserDto`, wire `create` through controller → service → repository to insert `UserPokemon` rows in the same request.
3. Extend the same wiring to `PUT /:id`, with replace-the-full-set semantics when `pokemonIds` is present.
4. Debug two unrelated `QueryFailedError: duplicate key value violates unique constraint` reports from manual Swagger testing — traced to `UQ_fe0bb3f6520ee0469504521e710` (`username`) and `UQ_97672ac88f789774dd47f7c8be3` (`email`) via `psql \d users`; both were pre-existing values being reused, not code bugs.
5. Move `PokemonApiClient`'s hardcoded `baseUrl` to `ConfigService.get('POKEMON_API_BASE_URL', <default>)`, add the var to `.env`/`.env.example`.

## Notes
- This directly supersedes the "Steps completed" item 2 from the *Held Pokemon List* release above, which had deliberately chosen sub-resource-only assignment. Both paths now coexist: `pokemonIds` on create/update, and the dedicated `POST/DELETE /:id/pokemons` endpoints for incremental add/remove.
- As before, there is no global `ValidationPipe`, so nothing stops a client from sending a non-array, negative, or non-existent PokeAPI id in `pokemonIds` — an invalid id only surfaces as `name: 'unknown'` when read back.
- `PokemonApiClient` is still a plain injectable, not its own module — the `ConfigService` injection didn't require changing that.
- Requires restarting `npm run start:dev` to pick up both the DTO/controller changes and the new env var, since it runs via ts-node with no watch mode.

## Next steps
- Add a global `ValidationPipe` so `pokemonIds` (and other DTO fields) are actually validated at runtime
- Consider whether `pokemonIds` on `PUT` should support partial add/remove semantics instead of full-set replace
- Cache PokeAPI responses; validate `pokemonId`s against PokeAPI before insert (carried over from the previous release's next steps)

---

# Release Notes - E2E Testing Infrastructure

## Overview
This release adds an end-to-end test suite (`test/users.e2e-spec.ts`, run via `npm test`) exercising the full `users` API against a real, isolated Postgres database, with the PokeAPI boundary mocked at the HTTP level rather than the client class. It also adds debugger tooling for inspecting the live test database while a test run is paused.

## What was created / changed
- `jest.config.js` — new Jest config: `testMatch` for `test/**/*.e2e-spec.ts`, `globalSetup`, `setupFiles`, `ts-jest` transform, `testTimeout: 20000`
- `test/global-setup.ts` — drops and recreates an isolated test database (`<DB_NAME>_test`, or `TEST_DB_NAME` if set) once per test run, via the `pg` client directly, before any test file loads
- `test/env.setup.ts` — a `setupFiles` entry (runs before `AppModule` is imported) that points `process.env.DB_NAME` at the same test database name, so `synchronize: true` builds the schema fresh in isolation from dev data
- `test/test-db.config.ts` — centralizes test DB parameter resolution (`getTestDbName()`, `getAdminDbConfig()`) so `env.setup.ts` and `global-setup.ts` share one source of truth instead of duplicating the env-var fallback logic
- `test/test-app.helper.ts` — `initTestApp()` wraps the `Test.createTestingModule({ imports: [AppModule] }).compile()` / `createNestApplication()` / `setGlobalPrefix('api')` / `app.init()` boilerplate, returning `{ app, dataSource }`
- `test/fetch-mock.helper.ts` — generic `mockJsonResponse(status, body)`, building a minimal `Response`-shaped object for any test that needs to mock `fetch`
- `test/users.e2e-spec.ts` — the suite itself: 12 tests across create/read/update/delete and the pokemon sub-resource endpoints; mocks `global.fetch` (not `PokemonApiClient` — the real client runs against the mocked network boundary) via a curated `mockPokemonData` array and a `getPokemonIdFromUrl()` lookup matched with `endsWith` (not `includes`, to avoid a short id like `6` false-matching a longer one like `65`)
- `package.json` — `test` script (`jest`); `test:debug` script (`node --inspect-brk`, `--runInBand`, `--testTimeout=600000`)
- `.vscode/launch.json` — "Debug e2e tests (Jest)" launch config, so the debugger can be attached from VS Code's Run & Debug panel with editor breakpoints

## Steps completed
1. Stand up the base e2e harness: Jest config, isolated test database (drop/recreate once per run, truncate between individual tests), `supertest` against the real `INestApplication`.
2. Mock `PokemonApiClient` for the first pass via `.overrideProvider(PokemonApiClient).useValue(...)` on the testing module — deterministic `pokemon-<id>` names without hitting the real PokeAPI.
3. On request, move the mock down a layer: mock the global `fetch` instead of the client class, so `PokemonApiClient`'s own logic (URL building, per-item error handling) runs for real in tests.
4. Tighten a fetch-call assertion that used `stringContaining('/6')` (could false-match `/64`) to `stringMatching(/\/6$/)`.
5. Tighten the mock's own id-extraction to match the literal `/pokemon/<id>` endpoint shape via an anchored regex, instead of naively parsing whatever follows the URL's last `/`.
6. Weigh whether test DB connection parameters should be injectable via `TypeOrmModule.forRootAsync` (would let a test helper pass DB config directly, no env-var mutation) versus centralizing while keeping the existing env-var mechanism; chose the latter with the project owner (lower risk, no changes to `src/app.module.ts`) and extracted `test/test-db.config.ts` plus `test/test-app.helper.ts#initTestApp()` accordingly.
7. Reorganize the fetch mock on request: keep only the generic response-builder (`mockJsonResponse`) in a helper file; move the Pokemon-specific mock data and id-matching logic into the spec file itself, since it belongs to that spec's domain, not shared scaffolding.
8. Switch the id lookup from a generic anchored-regex parse to an explicit curated `mockPokemonData` array + `endsWith` match, per the project owner's preferred style; verified no id in the current test suite (25, 6, 95, 120, 121, 130) collides as a numeric prefix of another.
9. Add `npm run test:debug` and a matching VS Code launch config so a breakpoint dropped after a `createUser(...)` call can pause execution long enough (600s test timeout override) to inspect the live test database with an external Postgres client before the next test's `beforeEach` truncates it.
10. Verify after each step: full `npm test` run, 12/12 passing.

## Notes
- The one `ERROR [ExceptionsHandler] duplicate key value violates unique constraint ...` line in test output is expected — it's Nest's default exception logger firing during the "rejects a duplicate username" test, which intentionally triggers that constraint violation and asserts on the resulting `500`.
- `initTestApp()` does not take DB connection parameters as arguments; `AppModule`'s `TypeOrmModule.forRoot(...)` reads `DB_*` directly from `process.env` at import time, so the helper still depends on `env.setup.ts` having pointed `DB_NAME` at the test database first.
- New pokemon ids introduced by future tests need a matching entry added to `mockPokemonData` in `test/users.e2e-spec.ts`.
- Debugging note: `jest.config.js`'s default `testTimeout` is 20000ms — pausing at a breakpoint longer than that under the plain `npm test` script would fail the test; `test:debug` overrides it to 600000ms specifically for this reason.

## Next steps
- Consider adding unit tests (service/repository level) alongside the e2e suite, since e2e coverage alone means every test run needs Postgres up
- Add a lint script (still outstanding from prior releases) and consider running it in the same pass as `npm test`
- Carry over unresolved items from prior releases: global `ValidationPipe`, password hashing, PokeAPI response caching, migrations instead of `synchronize`
