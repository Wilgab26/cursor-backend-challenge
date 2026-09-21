# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A minimal NestJS API scaffold (`cursor-backend-challenge`). It exposes a single `users` resource backed by **PostgreSQL via TypeORM**. Swagger/OpenAPI docs are auto-generated from decorators.

## Commands

```powershell
npm install             # install dependencies
npm run docker:up        # start local Postgres (docker compose up -d)
npm run docker:down      # stop local Postgres
npm run docker:test:up   # start just the dedicated test Postgres (docker-compose.test.yml), e.g. to inspect it manually
npm run docker:test:down # stop the dedicated test Postgres (and the e2e service/network if still up)
npm run build            # compile to dist/ via tsc (tsconfig.build.json)
npm start                 # run compiled output: node dist/main
npm run start:dev         # run directly from src/ via ts-node (no build step, no watch)
npm run start:debug       # ts-node with --inspect-brk for debugger attach
npm test                  # run the e2e/integration suite from the host (jest, see below) — needs docker:test:up first, NOT docker:up
npm run test:debug        # jest --runInBand --testTimeout=600000 with --inspect-brk, for debugger attach on the e2e suite
```

`npm test` run bare like this hits `docker:test:up`'s `postgres-test` container directly from the host (`localhost:5434`) — fast for local iteration, no image rebuild. `./up_test.sh` instead runs the whole thing fully containerized (see below) — slower (rebuilds the image) but matches what CI would run and needs nothing installed locally beyond Docker.

[up_dev.sh](up_dev.sh) wraps local dev into one script: copy `.env.example` → `.env` if missing, `npm install` if `node_modules` is missing, `docker:up`, poll `pg_isready`, then `start:dev`. [up_test.sh](up_test.sh) is fully containerized instead (see below) — it doesn't touch host `node_modules` at all. Both are POSIX shell, so run them from Git Bash/WSL, not PowerShell directly.

Copy `.env.example` to `.env` before running the app — `ConfigModule` loads DB connection settings (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`) plus `POKEMON_API_BASE_URL` from it. The Postgres container publishes on host port **5433** (not 5432) by default — this machine already runs a native Postgres Windows service on 5432, so the mapping was moved to avoid colliding with it; adjust `DB_PORT` in `.env` and `docker-compose.yml` if that's not true in a given environment.

There is still **no lint script**. Testing infra was added (jest config in [jest.config.js](jest.config.js), `test` script in `package.json`), covering `test/users.e2e-spec.ts`:
- Runs against a **real Postgres database**, not mocks, in a **dedicated container separate from dev** — [docker-compose.test.yml](docker-compose.test.yml) defines `postgres-test` (own container `users-postgres-test`, own host port `TEST_DB_PORT`/5434, with a `pg_isready` healthcheck) plus an `e2e` service that builds the same [Dockerfile](Dockerfile) as the `api` service in the main `docker-compose.yml` but runs `npm test` instead, `depends_on: postgres-test: condition: service_healthy` so it never races Postgres startup. The `e2e` service talks to `postgres-test` over the compose network by service name/internal port (`TEST_DB_HOST=postgres-test`, `TEST_DB_PORT=5432` — *not* the host-mapped 5434, which only matters when connecting from outside Docker).
- [up_test.sh](up_test.sh) is the one-shot entry point: `docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from e2e`, then always tears both containers down, exiting with the test run's own exit code (so it's CI-friendly — no local `npm install`/Postgres needed on the host at all, only Docker). `npm run docker:test:up` (targets just `postgres-test`, e.g. for manually inspecting the test DB with `psql`) / `docker:test:down` remain available for that narrower use.
- [test/test-db.config.ts](test/test-db.config.ts) is the single source of truth for connection resolution, and is what makes the same test suite work whether run on the host (against `localhost:5434`) or inside the `e2e` container (against `postgres-test:5432`) — both are just different values for the same env vars: `getTestDbConnection()` returns the host/port/credentials (`TEST_DB_HOST`/`TEST_DB_PORT`, defaulting to `127.0.0.1`/`5434` for host runs; reuses `DB_USERNAME`/`DB_PASSWORD`), `getTestDbName()` computes the target database name (`TEST_DB_NAME`, default `users_db_test`), and `getAdminDbConfig()` combines the former with Postgres's built-in `postgres` maintenance database (a connection can't `DROP`/`CREATE` the database it's connected to). [test/global-setup.ts](test/global-setup.ts) uses both to drop and recreate the test database once per test run (via Jest's `globalSetup`, using the `pg` client directly); [test/env.setup.ts](test/env.setup.ts) (a Jest `setupFiles` entry, so it runs before `AppModule` is imported) uses `getTestDbConnection()`/`getTestDbName()` to point `process.env.DB_HOST`/`DB_PORT`/`DB_NAME` at that database. `synchronize: true` then builds the schema on first connect, same as dev.
- [test/test-app.helper.ts](test/test-app.helper.ts)'s `initTestApp()` wraps the `Test.createTestingModule({ imports: [AppModule] }).compile()` / `createNestApplication()` / `setGlobalPrefix('api')` / `app.init()` boilerplate and returns `{ app, dataSource }`; specs call it from `beforeAll` instead of repeating that setup. Since `AppModule`'s `TypeOrmModule.forRoot(...)` reads `DB_*` straight from `process.env`, this still relies on `env.setup.ts` having already pointed `DB_NAME` at the test database before `AppModule` is imported — `initTestApp()` doesn't take DB params directly.
- The suite truncates `user_pokemons`/`users` (`RESTART IDENTITY CASCADE`) in a `beforeEach` for per-test isolation, rather than dropping the DB between individual tests.
- `PokemonApiClient` runs unmodified in tests; instead the global `fetch` is swapped for a mock so tests never hit the real PokeAPI. The generic piece — [test/fetch-mock.helper.ts](test/fetch-mock.helper.ts)'s `mockJsonResponse(status, body)`, building a minimal `Response`-shaped object — is the only part in the helper. Everything Pokemon-specific lives directly in `test/users.e2e-spec.ts`: a curated `mockPokemonData` array (covering every pokemon id the suite's tests actually reference — add an entry here when a new id is used in a new test), `getPokemonIdFromUrl()` (looks up the id by matching the URL's trailing `/pokemon/<id>` segment via `endsWith`, not `includes`, to avoid a shorter id like `6` false-matching a longer one like `65`), and the `mockFetch` spy itself (a `jest.fn` built from those two, assigned to `global.fetch` in `beforeAll`/restored in `afterAll`).
- Needs `.ts` files with `import * as X from 'y'` handled carefully: `isolatedModules: true` is set in `tsconfig.json` (silences a ts-jest hybrid-module-kind warning caused by `"module": "Node16"`), and under that setting `supertest`'s default export must be pulled in via `const request = require('supertest')` — a namespace import (`import * as request from 'supertest'`) gets wrapped in a non-callable interop object and breaks at runtime.

Once the app is running, it serves:
- API: `http://localhost:3001/api` (global prefix is `api`, set in [src/main.ts](src/main.ts))
- Swagger UI: `http://localhost:3001/docs`
- Port is `process.env.PORT ?? 3001`.

**Gotcha:** the full containerized `api` service in [docker-compose.yml](docker-compose.yml) is on a different port than local dev — it hardcodes `PORT: 3000` and maps host `3000:3000` (matching the `Dockerfile`'s `EXPOSE 3000`), while `start:dev`/`.env.example` default to `3001`. Docs/Swagger UI is on `:3000` when running via `docker compose up` for the `api` service (not `up_dev.sh`, which uses `docker:up` for Postgres only and runs the app locally via `start:dev` on `3001`).

## Architecture

Standard NestJS layered module structure, currently with one feature module:

- [src/main.ts](src/main.ts) — bootstraps `AppModule`, sets the global `/api` prefix, and wires up Swagger at `/docs`.
- [src/app.module.ts](src/app.module.ts) — root module; imports `UsersModule`.
- [src/users/](src/users/) — the users feature module, layered as:
  - `users.controller.ts` — HTTP routes (`GET/POST/PUT/DELETE /users`, plus `POST/DELETE /users/:id/pokemons(/:pokemonId)`), Swagger decorators (`@ApiTags`, `@ApiOperation`, etc.).
  - `users.service.ts` — business logic; translates "not found" repository results into `NotFoundException`. Pure pass-through to the repository, including for the pokemon methods.
  - `users.repository.ts` — data access, wraps a TypeORM `Repository<User>` and `Repository<UserPokemon>` injected via `@InjectRepository(...)`. Also exports the `UserWithPokemons` type (a `User` with `pokemons` replaced by live-enriched `{id, name}` summaries). This is the layer to swap if a different persistence approach is introduced, and — per an explicit call by the project owner — the layer responsible for calling out to `PokemonApiClient` (not a separate service).
  - `user.entity.ts` — the `User` TypeORM entity (`@Entity('users')`) with `@Column`/`@PrimaryGeneratedColumn`, a `@OneToMany` to `UserPokemon`, also decorated with `@ApiProperty` for Swagger.
  - `user-pokemon.entity.ts` — join entity (`@Entity('user_pokemons')`) storing only `pokemonId` (the PokeAPI id) and a `@ManyToOne` back to `User` (`onDelete: 'CASCADE'`). No pokemon name/details are ever persisted — only the id.
  - `pokemon-api.client.ts` — `PokemonApiClient`, a plain `@Injectable` (not a `*.service.ts`, and not its own module — deliberately, per project owner preference) that calls PokeAPI via the global `fetch` (Node 18's built-in, no HTTP client dependency added). The base URL comes from `ConfigService.get('POKEMON_API_BASE_URL', <hardcoded default>)`, so it's overridable via env but works unset. `getManyByIds` fetches in parallel and swallows per-item failures (logs a warning, returns `name: 'unknown'`) so one bad/slow lookup doesn't break the whole response.
  - `dto/` — `CreateUserDto` (now includes `pokemonIds: number[]`), `UpdateUserDto` (a `PartialType` of `CreateUserDto`, so `pokemonIds` is optional there), `UserResponseDto` (includes `pokemons: PokemonSummaryDto[]`), `AddPokemonDto` (`{ pokemonId }`), `PokemonSummaryDto` (`{ id, name }`), each annotated with `@ApiProperty` for Swagger.

`AppModule` ([src/app.module.ts](src/app.module.ts)) wires up `ConfigModule.forRoot({ isGlobal: true })` (loads `.env`) and `TypeOrmModule.forRoot(...)` (Postgres connection, reads `DB_*` env vars, `entities: [User, UserPokemon]`). Each feature module registers its own entities via `TypeOrmModule.forFeature([...])` (see `users.module.ts`).

**Gotcha:** every entity must be listed in *both* places — the feature module's `TypeOrmModule.forFeature([...])` *and* the root `TypeOrmModule.forRoot({ entities: [...] })` in `app.module.ts`. Missing an entity from the root list fails with `TypeORMError: Entity metadata for X was not found` at boot (only surfaces once something references the relation) — this bit us once when `UserPokemon` was added to `users.module.ts` but not `app.module.ts`.

`synchronize: true` is on by default (`DB_SYNCHRONIZE` env var, defaults to true) — TypeORM auto-creates/updates tables from entity definitions on boot. This is dev-only; a real deployment should switch to migrations and set `DB_SYNCHRONIZE=false`.

`docker-compose.yml` defines a single `postgres` service (`postgres:16-alpine`) with a named volume for persistence; its env vars (`POSTGRES_USER/PASSWORD/DB`) are substituted from `.env` (docker compose auto-loads `.env` from the compose file's directory).

When adding a new feature, mirror this same controller → service → repository → entity/dto layering under a new `src/<feature>/` module, register the entity with `TypeOrmModule.forFeature([...])` in that module, and register the module in `AppModule`'s `imports`.

### Notes on current state

- `create`/`update` now take `CreateUserDto`/`UpdateUserDto` directly (not `Omit<User, 'id'>` / `Partial<User>`), since `pokemonIds` isn't a `User` entity field. There's still no global `ValidationPipe` registered in `main.ts`, so `class-validator` decorators (if added to DTOs) won't be enforced automatically — nothing stops a client from sending a garbage `pokemonIds` value beyond what TypeScript's structural typing catches at compile time.
- `POST /users` and `PUT /users/:id` accept an optional `pokemonIds: number[]` in the body (`users.repository.ts` `create`/`update`) — `create` inserts a `UserPokemon` row per id; `update` **replaces the full set** when `pokemonIds` is present, and leaves existing pokemons untouched when it's omitted entirely. This coexists with the dedicated `POST/DELETE /users/:id/pokemons(/:pokemonId)` endpoints for incremental add/remove.
- `UserResponseDto` includes `password`, so passwords currently pass straight through in API responses (and are stored in plain text — there's no hashing).

[RELEASE_NOTES.md](RELEASE_NOTES.md) has the full history of *why* the codebase evolved this way release by release (in-memory → Postgres, sub-resource-only pokemon assignment → also allowing it on create/update, the e2e test infra build-out), including design discussions with the project owner behind choices noted above (e.g. `PokemonApiClient` as a plain injectable, not a service/module). Check it before assuming an odd-looking design is accidental.
