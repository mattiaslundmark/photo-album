#!/bin/bash

# Restore Script for Photo Album
# Restores data and photos to Scaleway Object Storage from backup
# Prerequisites:
#   - AWS CLI configured with Scaleway credentials
#   - Backup archive file

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables from .env if exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Usage: ./restore.sh <backup-archive.tar.gz>${NC}"
    echo "Example: ./restore.sh ./backups/photo-album-backup-20240115_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Check required variables
if [ -z "$SCW_ACCESS_KEY" ] || [ -z "$SCW_SECRET_KEY" ] || [ -z "$SCW_BUCKET_NAME" ]; then
    echo -e "${RED}Error: Required environment variables not set${NC}"
    echo "Required: SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_BUCKET_NAME"
    exit 1
fi

SCW_ENDPOINT="${SCW_ENDPOINT:-https://s3.fr-par.scw.cloud}"
SCW_REGION="${SCW_REGION:-fr-par}"

echo -e "${GREEN}=== Photo Album Restore Script ===${NC}"
echo "Backup file: ${BACKUP_FILE}"
echo "Target bucket: ${SCW_BUCKET_NAME}"
echo ""

# Confirm restore
echo -e "${YELLOW}Warning: This will overwrite existing data in the bucket!${NC}"
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}" EXIT

echo -e "${YELLOW}Extracting backup archive...${NC}"
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the backup directory name
BACKUP_DIR=$(ls "${TEMP_DIR}")

# Configure AWS CLI for Scaleway
export AWS_ACCESS_KEY_ID="${SCW_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${SCW_SECRET_KEY}"

echo -e "${YELLOW}Uploading data files...${NC}"
if [ -d "${TEMP_DIR}/${BACKUP_DIR}/data" ]; then
    aws s3 sync "${TEMP_DIR}/${BACKUP_DIR}/data/" "s3://${SCW_BUCKET_NAME}/data/" \
        --endpoint-url "${SCW_ENDPOINT}" \
        --region "${SCW_REGION}"
fi

echo -e "${YELLOW}Uploading photos...${NC}"
if [ -d "${TEMP_DIR}/${BACKUP_DIR}/photos" ]; then
    aws s3 sync "${TEMP_DIR}/${BACKUP_DIR}/photos/" "s3://${SCW_BUCKET_NAME}/photos/" \
        --endpoint-url "${SCW_ENDPOINT}" \
        --region "${SCW_REGION}"
fi

echo -e "${YELLOW}Uploading thumbnails...${NC}"
if [ -d "${TEMP_DIR}/${BACKUP_DIR}/thumbnails" ]; then
    aws s3 sync "${TEMP_DIR}/${BACKUP_DIR}/thumbnails/" "s3://${SCW_BUCKET_NAME}/thumbnails/" \
        --endpoint-url "${SCW_ENDPOINT}" \
        --region "${SCW_REGION}"
fi

echo ""
echo -e "${GREEN}=== Restore Complete ===${NC}"
echo "Data restored to bucket: ${SCW_BUCKET_NAME}"
