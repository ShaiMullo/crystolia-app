#!/bin/bash
set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REGISTRY="268456953512.dkr.ecr.us-east-1.amazonaws.com"
FRONTEND_REPO="crystolia-frontend"
BACKEND_REPO="crystolia-backend"
IMAGE_TAG=$(git rev-parse --short HEAD)

echo "🚀 Starting Deployment Process..."
echo "🔹 Tag: $IMAGE_TAG"

# Login to ECR
echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build & Push Backend
echo "📦 Building Backend..."
docker build --platform linux/amd64 -t $ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG ./backend
docker push $ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG
echo "✅ Backend Initialized."

# Build & Push Frontend
echo "📦 Building Frontend..."
docker build --platform linux/amd64 -t $ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG ./frontend
docker push $ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG
echo "✅ Frontend Initialized."

echo "🎉 Deployment Images Pushed Successfully!"
echo "Next Step: Update Helm Chart values.yaml with tag: $IMAGE_TAG"
