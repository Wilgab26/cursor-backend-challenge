import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserPokemon } from './user-pokemon.entity';
import { PokemonApiClient } from './pokemon-api.client';
import { PokemonSummaryDto } from './dto/pokemon-summary.dto';

export type UserWithPokemons = Omit<User, 'pokemons'> & { pokemons: PokemonSummaryDto[] };

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    @InjectRepository(UserPokemon)
    private readonly userPokemonRepository: Repository<UserPokemon>,
    private readonly pokemonApiClient: PokemonApiClient,
  ) {}

  private async withPokemons(user: User): Promise<UserWithPokemons> {
    const pokemons = await this.pokemonApiClient.getManyByIds(user.pokemons.map((p) => p.pokemonId));
    return { ...user, pokemons };
  }

  async findAll(): Promise<UserWithPokemons[]> {
    const users = await this.repository.find({ relations: ['pokemons'] });
    return Promise.all(users.map((user) => this.withPokemons(user)));
  }

  async findById(id: number): Promise<UserWithPokemons | null> {
    const user = await this.repository.findOne({ where: { id }, relations: ['pokemons'] });

    if (!user) {
      return null;
    }

    return this.withPokemons(user);
  }

  async create(user: Omit<User, 'id' | 'pokemons'>, pokemonIds: number[] = []): Promise<UserWithPokemons> {
    const createdUser = this.repository.create(user);
    const savedUser = await this.repository.save(createdUser);

    if (pokemonIds.length > 0) {
      const userPokemons = pokemonIds.map((pokemonId) =>
        this.userPokemonRepository.create({ pokemonId, user: savedUser }),
      );
      await this.userPokemonRepository.save(userPokemons);
    }

    return (await this.findById(savedUser.id))!;
  }

  async update(
    id: number,
    user: Partial<Omit<User, 'id' | 'pokemons'>>,
    pokemonIds?: number[],
  ): Promise<UserWithPokemons | null> {
    const existingUser = await this.repository.findOneBy({ id });

    if (!existingUser) {
      return null;
    }

    Object.assign(existingUser, user);
    await this.repository.save(existingUser);

    if (pokemonIds !== undefined) {
      await this.userPokemonRepository.delete({ user: { id } });

      if (pokemonIds.length > 0) {
        const userPokemons = pokemonIds.map((pokemonId) =>
          this.userPokemonRepository.create({ pokemonId, user: existingUser }),
        );
        await this.userPokemonRepository.save(userPokemons);
      }
    }

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async addPokemon(userId: number, pokemonId: number): Promise<UserWithPokemons | null> {
    const user = await this.repository.findOneBy({ id: userId });

    if (!user) {
      return null;
    }

    const userPokemon = this.userPokemonRepository.create({ pokemonId, user });
    await this.userPokemonRepository.save(userPokemon);

    return this.findById(userId);
  }

  async removePokemon(userId: number, pokemonId: number): Promise<UserWithPokemons | null> {
    const user = await this.repository.findOneBy({ id: userId });

    if (!user) {
      return null;
    }

    await this.userPokemonRepository.delete({ user: { id: userId }, pokemonId });

    return this.findById(userId);
  }
}
