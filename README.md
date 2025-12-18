# ABCompuMed - AI Medical Device Maintenance Assistant

A sophisticated AI-powered platform for biomedical engineers to troubleshoot medical device failures, access repair solutions through intelligent analysis and web research, and build a self-learning fault database.

## Quick Start

### Prerequisites
- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL/TiDB database
- PayPal API credentials

### Installation

```bash
# Clone or navigate to project
cd /home/ubuntu/ABCompuMed

# Install dependencies
pnpm install

# Set up environment variables
# Edit .env with your configuration
# Required: DATABASE_URL, JWT_SECRET, VITE_APP_ID, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET

# Initialize database
pnpm db:push

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
ABCompuMed/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities
│   │   └── App.tsx        # Main router
│   └── public/            # Static assets
├── server/                # Express backend
│   ├── routers/           # tRPC procedure routers
│   ├── db.ts              # Database queries
│   ├── ai-agent.ts        # LLM integration
│   ├── web-scraper.ts     # Web scraping
│   └── _core/             # Framework plumbing
├── drizzle/               # Database schema
├── DOCUMENTATION.md       # English documentation
├── DOCUMENTATION_AR.md    # Arabic documentation
└── package.json
```

## Key Features

### 1. AI-Powered Fault Analysis
- Intelligent device fault analysis using LLM
- Root cause identification
- Step-by-step repair procedures
- Required spare parts identification
- Repair difficulty assessment

### 2. Document Processing
- Support for PDF, Word, images, and Excel files
- Automatic OCR text extraction
- Device information classification
- Full-text search capability

### 3. Web Search & Research
- Forum scraping with relevance scoring
- Multi-source parallel searching
- Automatic maintenance information extraction
- Robots.txt compliance

### 4. Knowledge Base
- Self-learning fault database
- Fault linking by shared specifications
- View tracking and ratings
- Device classification system

### 5. Subscription System
- Three pricing tiers (Free, Individual, Corporate)
- PayPal payment integration
- Automatic query quota management
- Monthly quota reset

### 6. Admin Dashboard
- Document management interface
- Search source management
- System analytics
- Settings configuration

## Environment Variables

```env
# Database
DATABASE_URL=mysql://user:password@host:3306/abcompumed

# Authentication
JWT_SECRET=your_jwt_secret_key
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Your Name

# Payment
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# Frontend
VITE_FRONTEND_URL=https://your-domain.com
VITE_FRONTEND_FORGE_API_KEY=your_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# Server
BUILT_IN_FORGE_API_KEY=your_api_key
BUILT_IN_FORGE_API_URL=https://api.manus.im
```

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Type check
pnpm check

# Format code
pnpm format

# Database operations
pnpm db:push          # Generate and run migrations
```

## Design System

**Art Deco Theme:**
- Deep black background (#050505)
- Metallic gold accents (#D4AF37 equivalent)
- Playfair Display for headlines
- Cormorant Garamond for body text
- Geometric ornamentation and stepped lines

## Security

- Manus OAuth authentication
- Role-based access control
- Encrypted S3 file storage
- Secure PayPal integration
- HTTPS-only connections
- Complete audit trail

## Support

**Email:** Support@abcompumed.shop  
**Hours:** 24/7 automated support  
**Premium Support:** Available for corporate tier subscribers

## Documentation

- **English:** See `DOCUMENTATION.md`
- **Arabic:** See `DOCUMENTATION_AR.md`

## License

ABCompuMed © 2024. All rights reserved.

## Version

**v1.0.0** - Initial Release

---

**Last Updated:** December 2024  
**Status:** Production Ready
