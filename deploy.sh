#!/bin/bash

# Scaleway Serverless Container Deployment Script
# Prerequisites:
#   - Scaleway CLI installed and configured (scw)
#   - Docker installed
#   - Scaleway Container Registry created

set -e

# Configuration - Update these values
SCW_REGION="${SCW_REGION:-fr-par}"
SCW_PROJECT_ID="${SCW_PROJECT_ID:-your-project-id}"
REGISTRY_NAMESPACE="${REGISTRY_NAMESPACE:-photo-album}"
CONTAINER_NAME="photo-album"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Photo Album Deployment Script ===${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v scw &> /dev/null; then
    echo -e "${RED}Error: Scaleway CLI (scw) is not installed${NC}"
    echo "Install it from: https://www.scaleway.com/en/docs/developer-tools/scaleway-cli/"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Get registry endpoint
REGISTRY_ENDPOINT="rg.${SCW_REGION}.scw.cloud/${REGISTRY_NAMESPACE}"
FULL_IMAGE_NAME="${REGISTRY_ENDPOINT}/${CONTAINER_NAME}:${IMAGE_TAG}"

echo -e "${GREEN}Building Docker image...${NC}"
docker build -f Dockerfile.scaleway -t ${CONTAINER_NAME}:${IMAGE_TAG} .

echo -e "${GREEN}Tagging image for Scaleway Registry...${NC}"
docker tag ${CONTAINER_NAME}:${IMAGE_TAG} ${FULL_IMAGE_NAME}

echo -e "${GREEN}Logging in to Scaleway Container Registry...${NC}"
scw registry login

echo -e "${GREEN}Pushing image to registry...${NC}"
docker push ${FULL_IMAGE_NAME}

echo -e "${GREEN}Deploying to Scaleway Serverless Containers...${NC}"

# Check if container namespace exists, create if not
NAMESPACE_ID=$(scw container namespace list region=${SCW_REGION} -o json | jq -r ".[] | select(.name==\"${REGISTRY_NAMESPACE}\") | .id")

if [ -z "$NAMESPACE_ID" ] || [ "$NAMESPACE_ID" = "null" ]; then
    echo -e "${YELLOW}Creating container namespace...${NC}"
    NAMESPACE_ID=$(scw container namespace create name=${REGISTRY_NAMESPACE} region=${SCW_REGION} -o json | jq -r '.id')
fi

echo "Namespace ID: ${NAMESPACE_ID}"

# Check if container exists
CONTAINER_ID=$(scw container container list namespace-id=${NAMESPACE_ID} region=${SCW_REGION} -o json | jq -r ".[] | select(.name==\"${CONTAINER_NAME}\") | .id")

if [ -z "$CONTAINER_ID" ] || [ "$CONTAINER_ID" = "null" ]; then
    echo -e "${YELLOW}Creating new container...${NC}"
    scw container container create \
        namespace-id=${NAMESPACE_ID} \
        name=${CONTAINER_NAME} \
        registry-image=${FULL_IMAGE_NAME} \
        port=8080 \
        min-scale=0 \
        max-scale=5 \
        memory-limit=512 \
        cpu-limit=500 \
        region=${SCW_REGION} \
        privacy=public
else
    echo -e "${YELLOW}Updating existing container...${NC}"
    scw container container update \
        ${CONTAINER_ID} \
        registry-image=${FULL_IMAGE_NAME} \
        region=${SCW_REGION} \
        redeploy=true
fi

echo -e "${GREEN}Deployment complete!${NC}"

# Get container URL
echo -e "${YELLOW}Getting container endpoint...${NC}"
scw container container list namespace-id=${NAMESPACE_ID} region=${SCW_REGION} -o human

echo ""
echo -e "${GREEN}=== Deployment Summary ===${NC}"
echo "Image: ${FULL_IMAGE_NAME}"
echo "Region: ${SCW_REGION}"
echo ""
echo -e "${YELLOW}Note: Set environment variables in Scaleway Console:${NC}"
echo "  - SCW_ACCESS_KEY"
echo "  - SCW_SECRET_KEY"
echo "  - SCW_BUCKET_NAME"
echo "  - SCW_ENDPOINT"
echo "  - SCW_REGION"
echo "  - JWT_SECRET"
