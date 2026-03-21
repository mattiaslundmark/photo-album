#!/bin/bash

# Local development setup using Garage in Docker (S3-compatible storage)
#
# Usage:
#   ./local-setup-garage.sh          # Start and configure Garage
#   ./local-setup-garage.sh stop     # Stop and remove the container

set -e

CONTAINER_NAME="photo-album-garage"
GARAGE_DIR="./.garage"
GARAGE_CONFIG="${GARAGE_DIR}/garage.toml"
GARAGE_IMAGE="dxflrs/garage:v1.0.1"
BUCKET_NAME="photo-album"
KEY_NAME="local-dev"
S3_PORT=3900
RPC_PORT=3901
ADMIN_PORT=3903

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

GARAGE="docker exec ${CONTAINER_NAME} /garage"

# --- Stop command ---
if [ "${1}" = "stop" ]; then
    if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
        docker stop "${CONTAINER_NAME}" && docker rm "${CONTAINER_NAME}"
        echo -e "${GREEN}Garage stopped.${NC}"
    else
        echo -e "${YELLOW}Garage is not running.${NC}"
    fi
    exit 0
fi

echo -e "${GREEN}=== Photo Album Local Setup (Garage via Docker) ===${NC}"

# --- Prerequisites ---
if ! command -v docker &>/dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    exit 1
fi
if ! command -v openssl &>/dev/null; then
    echo -e "${RED}Error: openssl is required.${NC}"
    exit 1
fi

# --- Write config ---
mkdir -p "${GARAGE_DIR}/meta" "${GARAGE_DIR}/data"

if [ ! -f "${GARAGE_CONFIG}" ]; then
    RPC_SECRET=$(openssl rand -hex 32)
    cat > "${GARAGE_CONFIG}" << EOF
metadata_dir = "/meta"
data_dir = "/data"
db_engine = "lmdb"

replication_factor = 1

rpc_bind_addr = "0.0.0.0:${RPC_PORT}"
rpc_public_addr = "127.0.0.1:${RPC_PORT}"
rpc_secret = "${RPC_SECRET}"

[s3_api]
s3_region = "garage"
api_bind_addr = "0.0.0.0:${S3_PORT}"

[admin]
api_bind_addr = "0.0.0.0:${ADMIN_PORT}"
EOF
    echo -e "${GREEN}Garage config written.${NC}"
fi

# --- Start container ---
if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
    echo -e "${YELLOW}Garage container already running.${NC}"
else
    if docker ps -aq --filter "name=${CONTAINER_NAME}" | grep -q .; then
        docker rm "${CONTAINER_NAME}" > /dev/null
    fi

    echo -e "${YELLOW}Starting Garage container...${NC}"
    docker run -d \
        --name "${CONTAINER_NAME}" \
        -p "127.0.0.1:${S3_PORT}:${S3_PORT}" \
        -p "127.0.0.1:${RPC_PORT}:${RPC_PORT}" \
        -p "127.0.0.1:${ADMIN_PORT}:${ADMIN_PORT}" \
        -v "$(pwd)/${GARAGE_DIR}/meta:/meta" \
        -v "$(pwd)/${GARAGE_DIR}/data:/data" \
        -v "$(pwd)/${GARAGE_CONFIG}:/etc/garage.toml" \
        "${GARAGE_IMAGE}" > /dev/null
    echo -e "${GREEN}Container started.${NC}"
fi

# --- Wait for ready ---
echo -e "${YELLOW}Waiting for Garage to be ready...${NC}"
for i in $(seq 1 20); do
    if $GARAGE status > /dev/null 2>&1; then
        break
    fi
    if [ "$i" -eq 20 ]; then
        echo -e "${RED}Garage did not start in time. Check: docker logs ${CONTAINER_NAME}${NC}"
        exit 1
    fi
    sleep 1
done
echo -e "${GREEN}Garage is up.${NC}"

# --- Set up layout ---
# Node ID is the first hex token on any data line in garage status
NODE_ID=$($GARAGE status 2>&1 | awk '/^[0-9a-f]/{print $1; exit}')
if [ -z "$NODE_ID" ]; then
    echo -e "${RED}Could not determine node ID. Check: docker logs ${CONTAINER_NAME}${NC}"
    exit 1
fi
echo "Node ID: ${NODE_ID}"

if $GARAGE layout show 2>&1 | grep -q "${NODE_ID}"; then
    echo -e "${GREEN}Layout already configured.${NC}"
else
    echo -e "${YELLOW}Configuring storage layout...${NC}"
    $GARAGE layout assign -z local -c 1G "$NODE_ID"
    $GARAGE layout apply --version 1
    sleep 2
    echo -e "${GREEN}Layout applied.${NC}"
fi

# --- Create bucket ---
if ! $GARAGE bucket info "$BUCKET_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}Creating bucket '${BUCKET_NAME}'...${NC}"
    $GARAGE bucket create "$BUCKET_NAME"
else
    echo -e "${GREEN}Bucket '${BUCKET_NAME}' already exists.${NC}"
fi

# --- Access key: use garage key import so we always know the secret ---
# garage key info redacts the secret key, so we generate credentials ourselves
# and import them. Saved to .garage/credentials for idempotency.
CREDENTIALS_FILE="${GARAGE_DIR}/credentials"

if [ -f "${CREDENTIALS_FILE}" ] && $GARAGE key info "$KEY_NAME" > /dev/null 2>&1; then
    ACCESS_KEY=$(grep "^ACCESS_KEY=" "${CREDENTIALS_FILE}" | cut -d= -f2-)
    SECRET_KEY=$(grep "^SECRET_KEY=" "${CREDENTIALS_FILE}" | cut -d= -f2-)
    echo -e "${GREEN}Loaded existing credentials.${NC}"
else
    # Generate a fresh key pair and import it
    ACCESS_KEY="GK$(openssl rand -hex 12)"
    SECRET_KEY="$(openssl rand -hex 32)"

    # Remove stale key if present
    $GARAGE key delete --yes "$KEY_NAME" 2>/dev/null || true

    echo -e "${YELLOW}Importing access key '${KEY_NAME}'...${NC}"
    $GARAGE key import --yes -n "$KEY_NAME" "$ACCESS_KEY" "$SECRET_KEY"

    printf "ACCESS_KEY=%s\nSECRET_KEY=%s\n" "$ACCESS_KEY" "$SECRET_KEY" > "${CREDENTIALS_FILE}"
    chmod 600 "${CREDENTIALS_FILE}"
fi

$GARAGE bucket allow --read --write --owner "$BUCKET_NAME" --key "$KEY_NAME" 2>/dev/null || true

# --- Write .env.local (preserve existing JWT_SECRET) ---
JWT_SECRET=""
if [ -f ".env.local" ]; then
    JWT_SECRET=$(grep "^JWT_SECRET=" .env.local | cut -d= -f2-)
fi
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
fi

cat > .env.local << EOF
# Generated by local-setup-garage.sh
SCW_ACCESS_KEY=${ACCESS_KEY}
SCW_SECRET_KEY=${SECRET_KEY}
SCW_BUCKET_NAME=${BUCKET_NAME}
SCW_ENDPOINT=http://localhost:${S3_PORT}
SCW_REGION=garage
JWT_SECRET=${JWT_SECRET}
NODE_ENV=development
EOF

echo ""
echo -e "${GREEN}=== Setup complete ===${NC}"
echo ""
echo "  Garage S3:  http://localhost:${S3_PORT}"
echo "  Bucket:     ${BUCKET_NAME}"
echo "  Access key: ${ACCESS_KEY}"
echo ""
echo -e "${YELLOW}.env.local written.${NC}"
echo ""
echo "Run the dev server:"
echo "  npm run dev"
echo ""
echo "Stop Garage:"
echo "  ./local-setup-garage.sh stop"
echo ""
echo "View logs:"
echo "  docker logs ${CONTAINER_NAME}"
