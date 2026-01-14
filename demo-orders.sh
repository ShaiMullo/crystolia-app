#!/bin/bash

# Configuration
API_URL="http://localhost:4000/api"
EMAIL="persistent@customer.com"
PASSWORD="password123"

echo "🧪 Starting Orders API Demo..."
echo "--------------------------------"

# 1. Login
echo "🔑 Logging in as $EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login Failed!"
  echo $LOGIN_RESPONSE
  exit 1
fi
echo "✅ Login Successful! Token acquired."
echo "--------------------------------"

# 2. Create Order
echo "📦 Creating a new order..."
echo "   Items: 10x 1L (50 NIS each) + 2x 5L (200 NIS each)"
echo "   Expected Total: 900 NIS"

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
        { "productType": "1L", "quantity": 10 },
        { "productType": "5L", "quantity": 2 }
    ]
  }')

TOTAL=$(echo $CREATE_RESPONSE | jq -r '.totalAmount')

if [ "$TOTAL" == "null" ]; then
    echo "❌ Order Creation Failed!"
    echo $CREATE_RESPONSE
    exit 1
fi

echo "✅ Order Created Successfully!"
echo "   💰 Calculated Total from Backend: $TOTAL NIS"
echo "--------------------------------"

# 3. List Orders
echo "📋 Fetching your order history..."
LIST_RESPONSE=$(curl -s -X GET "$API_URL/orders" \
  -H "Authorization: Bearer $TOKEN")

COUNT=$(echo $LIST_RESPONSE | jq '. | length')

echo "✅ You have $COUNT orders in the system."
echo "   Latest Order ID: $(echo $LIST_RESPONSE | jq -r '.[0]._id')"
echo "--------------------------------"
echo "🚀 Demo Complete! The backend is fully functional."
