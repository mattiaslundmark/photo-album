#!/bin/bash

# Upload all images from a folder to a photo album
# Usage: ./upload-folder.sh <folder-path> [album-id]
#
# If album-id is not provided, you'll be prompted to select or create one.
# Requires: curl, jq

set -e

# Configuration - can be overridden with environment variables
API_URL="${PHOTO_ALBUM_URL:-http://localhost:3000}"
USERNAME="${PHOTO_ALBUM_USER:-}"
PASSWORD="${PHOTO_ALBUM_PASS:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

info() {
    echo -e "${GREEN}$1${NC}"
}

warn() {
    echo -e "${YELLOW}$1${NC}"
}

# Check dependencies
command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
command -v jq >/dev/null 2>&1 || error "jq is required but not installed"

# Validate arguments
FOLDER_PATH="$1"
ALBUM_ID="$2"

if [ -z "$FOLDER_PATH" ]; then
    echo "Usage: $0 <folder-path> [album-id]"
    echo ""
    echo "Environment variables:"
    echo "  PHOTO_ALBUM_URL   - API URL (default: http://localhost:3000)"
    echo "  PHOTO_ALBUM_USER  - Admin username"
    echo "  PHOTO_ALBUM_PASS  - Admin password"
    exit 1
fi

if [ ! -d "$FOLDER_PATH" ]; then
    error "Folder not found: $FOLDER_PATH"
fi

# Prompt for credentials if not set
if [ -z "$USERNAME" ]; then
    read -p "Admin username: " USERNAME
fi

if [ -z "$PASSWORD" ]; then
    read -s -p "Admin password: " PASSWORD
    echo ""
fi

# Authenticate and get token
info "Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"${USERNAME}\", \"password\": \"${PASSWORD}\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ]; then
    ERROR_MSG=$(echo "$AUTH_RESPONSE" | jq -r '.error // "Authentication failed"')
    error "$ERROR_MSG"
fi

info "Authenticated successfully"

# Function to list albums
list_albums() {
    curl -s -X GET "${API_URL}/api/albums" \
        -H "Authorization: Bearer ${TOKEN}" | jq -r '.data.albums[] | "\(.id)\t\(.title)"'
}

# Function to create album
create_album() {
    local title="$1"
    local response=$(curl -s -X POST "${API_URL}/api/albums" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"title\": \"${title}\"}")

    echo "$response" | jq -r '.data.album.id // empty'
}

# If no album ID provided, prompt user
if [ -z "$ALBUM_ID" ]; then
    echo ""
    echo "Available albums:"
    echo "----------------"
    ALBUMS=$(list_albums)

    if [ -n "$ALBUMS" ]; then
        echo "$ALBUMS" | nl -w2 -s'. '
        echo ""
    else
        echo "(No albums found)"
        echo ""
    fi

    echo "Enter album ID, or type 'new' to create a new album:"
    read -p "> " ALBUM_INPUT

    if [ "$ALBUM_INPUT" = "new" ]; then
        # Use folder name as default album title
        DEFAULT_TITLE=$(basename "$FOLDER_PATH")
        read -p "Album title [$DEFAULT_TITLE]: " ALBUM_TITLE
        ALBUM_TITLE="${ALBUM_TITLE:-$DEFAULT_TITLE}"

        info "Creating album: $ALBUM_TITLE"
        ALBUM_ID=$(create_album "$ALBUM_TITLE")

        if [ -z "$ALBUM_ID" ]; then
            error "Failed to create album"
        fi

        info "Created album with ID: $ALBUM_ID"
    else
        ALBUM_ID="$ALBUM_INPUT"
    fi
fi

# Find image files
IMAGE_FILES=$(find "$FOLDER_PATH" -maxdepth 1 -type f \( \
    -iname "*.jpg" -o \
    -iname "*.jpeg" -o \
    -iname "*.png" -o \
    -iname "*.gif" -o \
    -iname "*.webp" -o \
    -iname "*.heic" -o \
    -iname "*.heif" \
\) | sort)

if [ -z "$IMAGE_FILES" ]; then
    error "No image files found in $FOLDER_PATH"
fi

TOTAL=$(echo "$IMAGE_FILES" | wc -l)
info "Found $TOTAL image(s) to upload"
echo ""

# Upload each file
COUNT=0
FAILED=0

while IFS= read -r FILE; do
    COUNT=$((COUNT + 1))
    FILENAME=$(basename "$FILE")

    echo -n "[$COUNT/$TOTAL] Uploading $FILENAME... "

    RESPONSE=$(curl -s -X POST "${API_URL}/api/upload" \
        -H "Authorization: Bearer ${TOKEN}" \
        -F "file=@${FILE}" \
        -F "albumId=${ALBUM_ID}")

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')

    if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}OK${NC}"
    else
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
        echo -e "${RED}FAILED${NC} - $ERROR_MSG"
        FAILED=$((FAILED + 1))
    fi
done <<< "$IMAGE_FILES"

echo ""
info "Upload complete: $((COUNT - FAILED))/$COUNT succeeded"

if [ $FAILED -gt 0 ]; then
    warn "$FAILED file(s) failed to upload"
    exit 1
fi
