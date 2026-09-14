#!/bin/sh
set -e

if [ ! -f .env ]; then
  cp .env.example .env
fi

set +e
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from e2e
exit_code=$?
set -e

docker compose -f docker-compose.test.yml down

exit $exit_code