# SIB Webshop

E-commerce platform for SIB-Utrecht built with React, TypeScript, Convex, Mollie payments, and AWS Cognito authentication.

## Features

- 🛍️ Product catalog with variants (sizes, types, price tiers)
- 🛒 Shopping cart with persistent state
- 💳 Mollie payment integration for secure checkout
- 📦 Real-time stock management (stock decremented on successful payment)
- 🔐 Admin authentication with AWS Cognito
- 📊 Admin dashboard for orders and stock
- 🔔 Webhook support for payment status updates

## Payment Integration

The webshop uses Mollie for payment processing. Customers are redirected to Mollie's secure checkout page to complete their payment.

**Quick Links:**
- [Mollie Setup Guide](MOLLIE_SETUP.md) - Complete Mollie integration setup instructions

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
- Mollie account (for payment processing)
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
# AWS Cognito for admin auth
npx convex env set COGNITO_DOMAIN your-cognito-domain
npx convex env set COGNITO_CLIENT_ID your-client-id

# Mollie for payments (get from https://www.mollie.com/dashboard)
npx convex env set MOLLIE_API_KEY test_your_api_key_here
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
- **Payments**: Mollie
- **Auth**: AWS Cognito
- **UI Components**: Shadcn UI
- **Routing**: React Router v7
- **Build Tool**: Vite

## License

Copyright © 2026 SIB-Utrecht
