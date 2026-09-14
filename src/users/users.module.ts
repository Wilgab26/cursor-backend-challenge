import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User } from './user.entity';
import { UserPokemon } from './user-pokemon.entity';
import { PokemonApiClient } from './pokemon-api.client';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPokemon])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PokemonApiClient],
})
export class UsersModule {}
