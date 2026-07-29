#!/usr/bin/env bash

set -Eeuo pipefail

# 默认以脚本所在目录作为 Docker Compose 项目目录，也支持通过环境变量覆盖。
COMPOSE_DIR="${COMPOSE_DIR:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-${COMPOSE_DIR}/docker-compose.yml}"
SERVICE_NAME="${SERVICE_NAME:-scriverse}"
CONTAINER_NAME="${CONTAINER_NAME:-scriverse}"

cd -- "${COMPOSE_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker command was not found." >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Error: compose file was not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

echo "Validating Docker Compose configuration..."
docker compose -f "${COMPOSE_FILE}" config >/dev/null

OLD_IMAGE=""
if docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
  OLD_IMAGE="$(docker inspect --format '{{.Image}}' "${CONTAINER_NAME}")"
fi

echo "Pulling the latest Scriverse image..."
docker compose -f "${COMPOSE_FILE}" pull "${SERVICE_NAME}"

echo "Recreating the Scriverse container..."
docker compose -f "${COMPOSE_FILE}" up -d --no-deps --force-recreate "${SERVICE_NAME}"

echo "Current container status:"
docker compose -f "${COMPOSE_FILE}" ps "${SERVICE_NAME}"

if [[ -n "${OLD_IMAGE}" ]]; then
  NEW_IMAGE="$(docker inspect --format '{{.Image}}' "${CONTAINER_NAME}")"
  if [[ "${OLD_IMAGE}" == "${NEW_IMAGE}" ]]; then
    echo "Warning: the container image ID did not change."
  else
    echo "Scriverse image upgrade completed."
  fi
else
  echo "Scriverse container started."
fi

echo "Recent container logs:"
docker compose -f "${COMPOSE_FILE}" logs --tail=100 "${SERVICE_NAME}"
