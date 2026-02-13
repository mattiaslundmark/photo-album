#!/bin/bash

# Backup Script for Photo Album
# Backs up all data and photos from Scaleway Object Storage
# Prerequisites:
#   - AWS CLI or s3cmd configured with Scaleway credentials
#   - Environment variables set or .env file present

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="photo-album-backup-${TIMESTAMP}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables from .env if exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$SCW_ACCESS_KEY" ] || [ -z "$SCW_SECRET_KEY" ] || [ -z "$SCW_BUCKET_NAME" ]; then
    echo -e "${RED}Error: Required environment variables not set${NC}"
    echo "Required: SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_BUCKET_NAME"
    exit 1
fi

SCW_ENDPOINT="${SCW_ENDPOINT:-https://s3.fr-par.scw.cloud}"
SCW_REGION="${SCW_REGION:-fr-par}"

echo -e "${GREEN}=== Photo Album Backup Script ===${NC}"
echo "Bucket: ${SCW_BUCKET_NAME}"
echo "Backup directory: ${BACKUP_DIR}/${BACKUP_NAME}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

# Configure AWS CLI for Scaleway
export AWS_ACCESS_KEY_ID="${SCW_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${SCW_SECRET_KEY}"

echo -e "${YELLOW}Downloading data files...${NC}"
aws s3 cp "s3://${SCW_BUCKET_NAME}/data/" "${BACKUP_DIR}/${BACKUP_NAME}/data/" \
    --recursive \
    --endpoint-url "${SCW_ENDPOINT}" \
    --region "${SCW_REGION}" \
    2>/dev/null || echo "No data files found or download failed"

echo -e "${YELLOW}Downloading photos...${NC}"
aws s3 cp "s3://${SCW_BUCKET_NAME}/photos/" "${BACKUP_DIR}/${BACKUP_NAME}/photos/" \
    --recursive \
    --endpoint-url "${SCW_ENDPOINT}" \
    --region "${SCW_REGION}" \
    2>/dev/null || echo "No photos found or download failed"

echo -e "${YELLOW}Downloading thumbnails...${NC}"
aws s3 cp "s3://${SCW_BUCKET_NAME}/thumbnails/" "${BACKUP_DIR}/${BACKUP_NAME}/thumbnails/" \
    --recursive \
    --endpoint-url "${SCW_ENDPOINT}" \
    --region "${SCW_REGION}" \
    2>/dev/null || echo "No thumbnails found or download failed"

# Create compressed archive
echo -e "${YELLOW}Creating compressed archive...${NC}"
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

# Calculate size
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)

# Cleanup uncompressed backup
rm -rf "${BACKUP_NAME}"

echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo "Archive: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Size: ${BACKUP_SIZE}"
echo ""
echo -e "${YELLOW}To restore, use restore.sh or manually:${NC}"
echo "  tar -xzf ${BACKUP_NAME}.tar.gz"
echo "  aws s3 sync ${BACKUP_NAME}/ s3://${SCW_BUCKET_NAME}/ --endpoint-url ${SCW_ENDPOINT}"
