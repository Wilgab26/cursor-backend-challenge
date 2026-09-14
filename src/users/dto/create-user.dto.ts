import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'strongPassword123' })
  password: string;

  @ApiProperty({ description: 'PokeAPI ids of pokemons to add to the user on creation', example: [1, 4, 7], type: [Number] })
  pokemonIds: number[];
}
