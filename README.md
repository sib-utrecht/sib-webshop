# SIB Webshop

E-commerce platform for SIB-Utrecht built with React, TypeScript, Convex, and AWS Cognito authentication.

## Features

- 🛍️ Product catalog with variants (sizes, types, price tiers)
- 🛒 Shopping cart with persistent state
- 💳 Checkout process with stock validation
- 📦 Real-time stock management
- 🔐 Admin authentication with AWS Cognito
- 📊 Admin dashboard for orders and stock

## Authentication

Admin pages (Orders and Stock) require authentication. The system uses AWS Cognito for JWT-based authentication.

**Quick Links:**
- [Setup Guide](AUTH_SETUP.md) - Complete AWS Cognito setup instructions
- [Implementation Details](AUTH_IMPLEMENTATION.md) - Technical implementation overview
- [Quick Reference](AUTH_QUICKSTART.md) - Quick commands and code snippets

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Convex account
- AWS Cognito User Pool (for admin authentication)

### Installation

1. Clone the repository
```bash
git clone https://github.com/sib-utrecht/sib-webshop.git
cd sib-webshop
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your Convex and AWS Cognito credentials
```

4. Configure Convex
```bash
npx convex dev
```

5. Set Convex environment variables
```bash
npx convex env set COGNITO_DOMAIN your-cognito-domain
npx convex env set COGNITO_CLIENT_ID your-client-id
```

6. Seed the database (optional)
```bash
npx convex run seed:seed
```

7. Start the development server
```bash
npm run dev
```

## Project Structure

See [agents.md](agents.md) for detailed project documentation including:
- Complete feature requirements
- Tech stack details
- Database schema
- API reference
- User flows

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Type Check
```bash
tsc -b
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Backend**: Convex (serverless)
- **Auth**: AWS Cognito
- **UI Components**: Shadcn UI
- **Routing**: React Router v7
- **Build Tool**: Vite

## License

Copyright © 2025 SIB-Utrecht
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
