import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserPokemon } from './user-pokemon.entity';

@Entity('users')
export class User {
  @ApiProperty({
     description: 'the unique identifier for the user',
     example: 1
   })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'johndoe' })
  @Column({ unique: true })
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ example: 'strongPassword123' })
  @Column()
  password: string;

  @OneToMany(() => UserPokemon, (userPokemon) => userPokemon.user)
  pokemons: UserPokemon[];

  constructor(partial: Partial<User> = {}) {
    Object.assign(this, partial);
  }
}