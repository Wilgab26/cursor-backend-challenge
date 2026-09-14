docker-compose -f docker-compose.yml up --build --force-recreate
# #!/bin/sh
# set -e

# if [ ! -f .env ]; then
#   cp .env.example .env
# fi

# if [ ! -d node_modules ]; then
#   npm install
# fi

# npm run docker:up

# echo "Waiting for Postgres to be ready..."
# until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
#   sleep 1
# done

# npm run start:dev
