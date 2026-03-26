#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# DOTZ Setup Script
# ─────────────────────────────────────────────────────────────────────────────

echo "🎮 DOTZ Setup"
echo "============="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo "✓ Dependencies installed"
else
  echo "✓ Dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "📝 Creating .env from template..."
  cp .env.example .env
  echo "✓ .env created"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env and update:"
  echo "   - VITE_NETWORK (base-sepolia or base-mainnet)"
  echo "   - Contract addresses"
  echo ""
else
  echo "✓ .env already exists"
fi

echo ""
echo "📋 Configuration:"
echo "  - Edit config.js to switch networks"
echo "  - Line 5: const NETWORK = 'base-sepolia'"
echo ""
echo "🚀 Start development:"
echo "  npm run dev"
echo ""
echo "🏗️  Build for production:"
echo "  npm run build"
echo ""
echo "✅ Setup complete!"
