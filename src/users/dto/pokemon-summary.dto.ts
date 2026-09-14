import { ApiProperty } from '@nestjs/swagger';

export class PokemonSummaryDto {
  @ApiProperty({ description: 'the PokeAPI id of the pokemon', example: 25 })
  id: number;

  @ApiProperty({ description: 'the pokemon name, fetched live from PokeAPI', example: 'pikachu' })
  name: string;
}
