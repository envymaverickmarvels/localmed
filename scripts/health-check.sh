#!/bin/bash

# LocalMed Health Check Script
# Run this script to verify deployment health

set -e

API_URL="${API_URL:-http://localhost:3000}"
WEB_URL="${WEB_URL:-http://localhost:3001}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "LocalMed Health Check"
echo "======================================"

# Function to check HTTP endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    echo -n "Checking $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC} (Status: $response)"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Status: $response)"
        return 1
    fi
}

# Function to check Docker container
check_container() {
    local name=$1

    echo -n "Checking container $name... "

    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
        status=$(docker inspect --format='{{.State.Status}}' "$name" 2>/dev/null || echo "unknown")
        if [ "$status" = "running" ]; then
            echo -e "${GREEN}✓ Running${NC}"
            return 0
        else
            echo -e "${RED}✗ Not running (Status: $status)${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Not found${NC}"
        return 1
    fi
}

# Check Docker containers
echo ""
echo "1. Checking Docker Containers"
echo "--------------------------------------"
containers=("localmed-postgres" "localmed-redis" "localmed-api")
container_errors=0

for container in "${containers[@]}"; do
    check_container "$container" || ((container_errors++))
done

# Check HTTP endpoints
echo ""
echo "2. Checking HTTP Endpoints"
echo "--------------------------------------"
http_errors=0

check_endpoint "API Health" "$API_URL/health" || ((http_errors++))
check_endpoint "API API Docs" "$API_URL/api/health" || ((http_errors++))

# Check database connectivity
echo ""
echo "3. Checking Database Connection"
echo "--------------------------------------"
echo -n "PostgreSQL connection... "

if docker exec localmed-postgres pg_isready -U localmed -d localmed > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    ((http_errors++))
fi

# Check Redis
echo -n "Redis connection... "
if docker exec localmed-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    ((http_errors++))
fi

# Check disk space
echo ""
echo "4. Checking System Resources"
echo "--------------------------------------"
echo -n "Disk space... "
disk_usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    echo -e "${GREEN}✓ OK${NC} (Usage: $disk_usage%)"
else
    echo -e "${YELLOW}! WARNING${NC} (Usage: $disk_usage%)"
fi

echo -n "Memory usage... "
mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$mem_usage" -lt 80 ]; then
    echo -e "${GREEN}✓ OK${NC} (Usage: $mem_usage%)"
else
    echo -e "${YELLOW}! WARNING${NC} (Usage: $mem_usage%)"
fi

# Summary
echo ""
echo "======================================"
echo "Summary"
echo "======================================"

total_errors=$((container_errors + http_errors))

if [ "$total_errors" -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Failed checks: $total_errors${NC}"
    exit 1
fi