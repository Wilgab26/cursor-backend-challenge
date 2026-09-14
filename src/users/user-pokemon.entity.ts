import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_pokemons')
export class UserPokemon {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'the PokeAPI id of the held pokemon', example: 25 })
  @Column({ name: 'pokemon_id' })
  pokemonId: number;

  @ManyToOne(() => User, (user) => user.pokemons, { onDelete: 'CASCADE' })
  user: User;
}
