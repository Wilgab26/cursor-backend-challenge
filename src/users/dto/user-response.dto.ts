import { ApiProperty } from '@nestjs/swagger';
import { PokemonSummaryDto } from './pokemon-summary.dto';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'strongPassword123' })
  password: string;

  @ApiProperty({ type: [PokemonSummaryDto] })
  pokemons: PokemonSummaryDto[];

  constructor(partial: Partial<UserResponseDto> = {}) {
    Object.assign(this, partial);
  }
}
