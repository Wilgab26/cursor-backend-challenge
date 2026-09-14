import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AddPokemonDto } from './dto/add-pokemon.dto';
import { UsersService } from './users.service';
import { UserWithPokemons } from './users.repository';

@ApiTags('users')

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserResponseDto] })
  async findAll(): Promise<UserWithPokemons[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'The found user', type: UserResponseDto })
  async findById(@Param('id') id: string): Promise<UserWithPokemons> {
    return this.usersService.findById(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'The created user', type: UserResponseDto })
  async create(@Body() body: CreateUserDto): Promise<UserWithPokemons> {
    const { pokemonIds, ...user } = body;
    return this.usersService.create(user, pokemonIds);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'The updated user', type: UserResponseDto })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto)
    : Promise<UserWithPokemons> {
    const { pokemonIds, ...user } = body;
    return this.usersService.update(Number(id), user, pokemonIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async delete(@Param('id') id: string): Promise<boolean> {
    return this.usersService.delete(Number(id));
  }

  @Post(':id/pokemons')
  @ApiOperation({ summary: "Add a pokemon to a user's list" })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: AddPokemonDto })
  @ApiResponse({ status: 201, description: 'The updated user', type: UserResponseDto })
  async addPokemon(
    @Param('id') id: string,
    @Body() body: AddPokemonDto,
  ): Promise<UserWithPokemons> {
    return this.usersService.addPokemon(Number(id), body.pokemonId);
  }

  @Delete(':id/pokemons/:pokemonId')
  @ApiOperation({ summary: "Remove a pokemon from a user's list" })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'pokemonId', type: Number })
  @ApiResponse({ status: 200, description: 'The updated user', type: UserResponseDto })
  async removePokemon(
    @Param('id') id: string,
    @Param('pokemonId') pokemonId: string,
  ): Promise<UserWithPokemons> {
    return this.usersService.removePokemon(Number(id), Number(pokemonId));
  }
}
