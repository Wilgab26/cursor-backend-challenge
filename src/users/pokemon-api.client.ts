import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PokemonInfo {
  id: number;
  name: string;
}

@Injectable()
export class PokemonApiClient {
  private readonly logger = new Logger(PokemonApiClient.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'POKEMON_API_BASE_URL',
      'https://pokeapi.co/api/v2/pokemon',
    );
  }

  async getById(pokemonId: number): Promise<PokemonInfo> {
    const response = await fetch(`${this.baseUrl}/${pokemonId}`);

    if (!response.ok) {
      throw new Error(`PokeAPI request for pokemon ${pokemonId} failed with status ${response.status}`);
    }

    const data = await response.json();
    return { id: pokemonId, name: data.name };
  }

  async getManyByIds(pokemonIds: number[]): Promise<PokemonInfo[]> {
    return Promise.all(
      pokemonIds.map(async (id) => {
        try {
          return await this.getById(id);
        } catch (error) {
          this.logger.warn(`Failed to fetch pokemon ${id} from PokeAPI: ${(error as Error).message}`);
          return { id, name: 'unknown' };
        }
      }),
    );
  }
}
