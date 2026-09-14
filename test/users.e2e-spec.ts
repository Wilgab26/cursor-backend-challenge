import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

const request = require('supertest');
import { mockJsonResponse } from './fetch-mock.helper';
import { initTestApp } from './test-app.helper';

const mockPokemonData = [
  { id: 25, name: 'pokemon-25' },
  { id: 6, name: 'pokemon-6' },
  { id: 95, name: 'pokemon-95' },
  { id: 120, name: 'pokemon-120' },
  { id: 121, name: 'pokemon-121' },
  { id: 130, name: 'pokemon-130' },
];

function getPokemonIdFromUrl(url: string): number | null {
  for (const pokemon of mockPokemonData) {
    if (url.endsWith(`/pokemon/${pokemon.id}`)) {
      return pokemon.id;
    }
  }
  return null;
}

describe('Users (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const realFetch = global.fetch;
  const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
    const id = getPokemonIdFromUrl(input.toString());
    const pokemon = mockPokemonData.find((p) => p.id === id);

    if (!pokemon) {
      return mockJsonResponse(404, {});
    }

    return mockJsonResponse(200, { name: pokemon.name });
  });

  beforeAll(async () => {
    global.fetch = mockFetch as unknown as typeof fetch;

    ({ app, dataSource } = await initTestApp());
  });

  afterAll(async () => {
    await app.close();
    global.fetch = realFetch;
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE "user_pokemons", "users" RESTART IDENTITY CASCADE');
    mockFetch.mockClear();
  });

  const createUser = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/users')
      .send({
        username: 'ash',
        email: 'ash@example.com',
        password: 'pikachu123',
        ...overrides,
      });

  describe('POST /api/users', () => {
    it('creates a user and persists it for later reads', async () => {
      const response = await createUser().expect(201);

      expect(response.body).toMatchObject({
        username: 'ash',
        email: 'ash@example.com',
        pokemons: [],
      });
      expect(response.body.id).toEqual(expect.any(Number));

      await request(app.getHttpServer())
        .get(`/api/users/${response.body.id}`)
        .expect(200)
        .expect((res) => expect(res.body.username).toBe('ash'));
    });

    it('creates a user with pokemons, enriched via the (mocked) PokeAPI client', async () => {
      const response = await createUser({ pokemonIds: [25, 6] }).expect(201);

      expect(response.body.pokemons).toEqual([
        { id: 25, name: 'pokemon-25' },
        { id: 6, name: 'pokemon-6' },
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(/\/25$/));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(/\/6$/));
    });

    it('rejects a duplicate username with the underlying unique-constraint error', async () => {
      await createUser().expect(201);

      await createUser({ email: 'someone-else@example.com' }).expect(500);
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns 404 for a user that does not exist', async () => {
      await request(app.getHttpServer()).get('/api/users/999999').expect(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('replaces the full pokemon set when pokemonIds is provided', async () => {
      const created = await createUser({ pokemonIds: [120] }).expect(201);

      const updated = await request(app.getHttpServer())
        .put(`/api/users/${created.body.id}`)
        .send({ pokemonIds: [121, 130] })
        .expect(200);

      expect(updated.body.pokemons.map((p: { id: number }) => p.id)).toEqual([121, 130]);
    });

    it('leaves existing pokemons untouched when pokemonIds is omitted', async () => {
      const created = await createUser({ pokemonIds: [120] }).expect(201);

      const updated = await request(app.getHttpServer())
        .put(`/api/users/${created.body.id}`)
        .send({ username: 'ash-ketchum' })
        .expect(200);

      expect(updated.body.username).toBe('ash-ketchum');
      expect(updated.body.pokemons.map((p: { id: number }) => p.id)).toEqual([120]);
    });

    it('returns 404 when updating a user that does not exist', async () => {
      await request(app.getHttpServer()).put('/api/users/999999').send({ username: 'nobody' }).expect(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('deletes a user, after which reads 404', async () => {
      const created = await createUser().expect(201);

      await request(app.getHttpServer()).delete(`/api/users/${created.body.id}`).expect(200);
      await request(app.getHttpServer()).get(`/api/users/${created.body.id}`).expect(404);
    });

    it('returns 404 when deleting a user that does not exist', async () => {
      await request(app.getHttpServer()).delete('/api/users/999999').expect(404);
    });
  });

  describe('POST/DELETE /api/users/:id/pokemons', () => {
    it('adds and removes a pokemon via the sub-resource endpoints', async () => {
      const created = await createUser().expect(201);
      const userId = created.body.id;

      const added = await request(app.getHttpServer())
        .post(`/api/users/${userId}/pokemons`)
        .send({ pokemonId: 95 })
        .expect(201);
      expect(added.body.pokemons).toEqual([{ id: 95, name: 'pokemon-95' }]);

      const removed = await request(app.getHttpServer())
        .delete(`/api/users/${userId}/pokemons/95`)
        .expect(200);
      expect(removed.body.pokemons).toEqual([]);
    });

    it('removing a pokemon the user does not hold is a no-op, not a 404', async () => {
      const created = await createUser().expect(201);

      await request(app.getHttpServer())
        .delete(`/api/users/${created.body.id}/pokemons/999`)
        .expect(200);
    });

    it('returns 404 when adding a pokemon to a user that does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/users/999999/pokemons')
        .send({ pokemonId: 25 })
        .expect(404);
    });
  });
});
