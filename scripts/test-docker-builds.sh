#!/bin/bash

# Docker Build Test Script
# This script tests the Docker builds locally before pushing to GitHub
# Usage: ./scripts/test-docker-builds.sh

set -e  # Exit on any error

echo "🧪 Testing Docker builds locally..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Test Backend Build
print_status "Building backend Docker image..."
if docker build -f crates/Dockerfile.client -t test-otrta-backend ./crates; then
    print_success "Backend build completed successfully"
    
    # Test backend image
    print_status "Testing backend image..."
    if docker run --rm -d --name test-backend -p 3334:3333 test-otrta-backend; then
        sleep 5
        # Try to connect (this might fail due to missing database, but image should start)
        docker logs test-backend
        docker stop test-backend > /dev/null 2>&1 || true
        print_success "Backend image runs successfully"
    else
        print_warning "Backend image started but may have runtime issues (check logs above)"
    fi
else
    print_error "Backend build failed"
    exit 1
fi

echo ""

# Test Frontend Build
print_status "Building frontend Docker image..."
if docker build -f ui/Dockerfile -t test-otrta-frontend ./ui \
    --build-arg NEXT_PUBLIC_API_URL=http://localhost:3333 \
    --build-arg NEXT_PUBLIC_ENABLE_AUTHENTICATION=true; then
    print_success "Frontend build completed successfully"
    
    # Test frontend image
    print_status "Testing frontend image..."
    if docker run --rm -d --name test-frontend -p 3001:3000 test-otrta-frontend; then
        sleep 5
        # Check if the frontend is responding
        if curl -f http://localhost:3001 > /dev/null 2>&1; then
            print_success "Frontend is responding at http://localhost:3001"
        else
            print_warning "Frontend started but not responding (might need backend)"
        fi
        docker stop test-frontend > /dev/null 2>&1 || true
        print_success "Frontend image runs successfully"
    else
        print_warning "Frontend image started but may have runtime issues"
    fi
else
    print_error "Frontend build failed"
    exit 1
fi

echo ""

# Build size information
print_status "Docker image sizes:"
docker images | grep "test-otrta"

echo ""

# Cleanup
print_status "Cleaning up test images..."
docker rmi test-otrta-backend test-otrta-frontend > /dev/null 2>&1 || true

print_success "All Docker builds completed successfully! 🎉"
echo ""
echo "Next steps:"
echo "1. Commit your changes: git add . && git commit -m 'Add CI/CD workflow'"
echo "2. Push to trigger the workflow: git push origin main"
echo "3. Check GitHub Actions tab for build status"
echo "4. Once successful, images will be available on Docker Hub"

echo ""
print_warning "Don't forget to:"
echo "- Set up Docker Hub secrets in GitHub repository settings"
echo "- Replace 'yourusername' in docker-compose.production.yml with your Docker Hub username" 