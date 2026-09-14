import { ApiProperty } from '@nestjs/swagger';

export class AddPokemonDto {
  @ApiProperty({ description: 'the PokeAPI id of the pokemon to add', example: 25 })
  pokemonId: number;
}
