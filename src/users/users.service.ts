import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './user.entity';
import { UsersRepository, UserWithPokemons } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll(): Promise<UserWithPokemons[]> {
    return this.usersRepository.findAll();
  }

  async findById(id: number): Promise<UserWithPokemons> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  create(user: Omit<User, 'id' | 'pokemons'>, pokemonIds: number[] = []): Promise<UserWithPokemons> {
    return this.usersRepository.create(user, pokemonIds);
  }

  async update(
    id: number,
    user: Partial<Omit<User, 'id' | 'pokemons'>>,
    pokemonIds?: number[],
  ): Promise<UserWithPokemons> {
    const updatedUser = await this.usersRepository.update(id, user, pokemonIds);

    if (!updatedUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return updatedUser;
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.usersRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return true;
  }

  async addPokemon(userId: number, pokemonId: number): Promise<UserWithPokemons> {
    const user = await this.usersRepository.addPokemon(userId, pokemonId);

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return user;
  }

  async removePokemon(userId: number, pokemonId: number): Promise<UserWithPokemons> {
    const user = await this.usersRepository.removePokemon(userId, pokemonId);

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return user;
  }
}
