# cursor-backend-challenge

A minimal NestJS API scaffold exposing a `users` resource backed by PostgreSQL via TypeORM, with pokemon data enriched live from PokeAPI. See [CLAUDE.md](CLAUDE.md) for architecture details.

### BADGES

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/Wilgab26/cursor-backend-challenge/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/Wilgab26/cursor-backend-challenge/tree/main)

### Features
- Create new Users with their Pokemon Ids
- Get Users list
- Get User by Id and also gathering Pokemon Names from Poke API
- Update User
- Delete USer

## Pre - Requisites

- Docker installed without SUDO permission
- Docker compose installed without SUDO
- Ports Free: 3001 and 5432

## How to run the APP

```
chmod 711 ./up_dev.sh
./up_dev.sh
```

## How to run the tests

```
chmod 711 ./up_test.sh
./up_test.sh
```

## How to run the tests

- Data should be moved from tests to an external file
- Generic method should be used to mock endpoints
- Error handling could be improved (I.E handle already existing user error)
- A seed migration would be useful to have an already working app with data
- The ORM is being used with Syncronize instead of migrations. Migrations would be the best option
- Deployment could be done

## Error to be Fixed 

- Docker app is not running properly


## Techs

- Nest 11
- Node : Node20.11.1
- TypeORM
- PostgreSQL

## Decisions made

- Clear Architecture : To be able to handle further changes in the future in a proper way.
- TypeORM: Because it is the already integrated ORM in the nest framework and it is the most popular ORM so it is easy to find fixes and people that know how to use it.
- Docker : To make Portable
- Jest / Testing / E2E : Jest ins the most used testing framework of JS. same argument as above. E2E testing was done because it is useless to always test every single part.
That's why if the controller provide the proper answer the test has passed.

## Route

- : [![API Swagger]](http://localhost:3000/docs) 

## Env Vars should be defined 

To find an example of the values you can use .env.example