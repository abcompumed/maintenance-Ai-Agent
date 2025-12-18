# ABCompuMed - AI Medical Device Maintenance Assistant

## Project Overview

ABCompuMed is a sophisticated AI-powered platform designed to assist biomedical engineers and maintenance technicians in troubleshooting medical device failures. The system combines intelligent fault analysis, web research capabilities, and a self-learning knowledge base to provide comprehensive maintenance solutions.

**Project Name:** ABCompuMed  
**Support Email:** Support@abcompumed.shop  
**Design Style:** Art Deco Revival (Deep Black & Metallic Gold)  
**Interface Language:** English  

---

## System Architecture

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS 4 for styling
- tRPC for type-safe API calls
- Wouter for routing
- Streamdown for markdown rendering

**Backend:**
- Express.js 4 with Node.js
- tRPC 11 for RPC procedures
- Drizzle ORM for database management
- MySQL/TiDB for data persistence

**External Services:**
- Manus OAuth for authentication
- PayPal REST API for payments
- S3 for file storage
- Tesseract.js for OCR
- Cheerio for web scraping
- Built-in LLM for AI analysis

### Database Schema

#### Core Tables

1. **users** - User accounts and authentication
   - Subscription tier tracking
   - Query quota management
   - Role-based access control

2. **subscriptions** - Payment and subscription records
   - Tier information (free/individual/corporate)
   - Payment status and transaction IDs
   - Expiry date tracking

3. **documents** - Uploaded maintenance files
   - OCR processing status
   - Device classification
   - S3 storage references

4. **faults** - Knowledge base of device faults
   - Fault descriptions and symptoms
   - Solutions and repair procedures
   - Parts requirements
   - Linked faults by similarity

5. **searchSources** - External websites and forums
   - Source URLs and types
   - Active/inactive status
   - Last scrape timestamps

6. **spareParts** - Spare parts database
   - Part numbers and specifications
   - Manufacturer information
   - Supplier links

7. **queryHistory** - Audit trail
   - User queries and results
   - Analytics tracking

8. **notifications** - System notifications
   - User alerts
   - Admin notifications

---

## Features

### 1. Intelligent Fault Analysis

**AI Agent Core:**
- Analyzes device faults using LLM
- Provides root cause identification
- Generates step-by-step repair procedures
- Identifies required spare parts
- Assesses repair difficulty

**Knowledge Base:**
- Self-learning system that stores discovered faults
- Fault linking by shared specifications and part numbers
- View tracking and helpfulness ratings
- Device classification by type, manufacturer, and model

### 2. Document Processing

**File Support:**
- PDF documents
- Microsoft Word (.docx, .doc)
- Images (PNG, JPG, WebP, TIFF)
- Excel files

**OCR Processing:**
- Automatic text extraction from scanned documents
- Device information classification
- Full-text search capability
- S3 storage integration

### 3. Web Search & Research

**Scraping Capabilities:**
- Forum scraping with relevance scoring
- Maintenance information extraction
- Multi-source parallel searching
- Robots.txt compliance

**Source Management:**
- Admin interface to add/remove sources
- Toggle source availability
- Track scrape history
- Support for various source types (forums, vendor sites, blogs)

### 4. Subscription System

**Pricing Tiers:**
- **Free:** 10 queries/month
- **Individual:** $10 per 10 queries
- **Corporate:** $35 per 20 queries

**Features:**
- PayPal integration for payments
- Automatic query quota tracking
- Monthly quota reset
- Subscription expiry notifications

### 5. Admin Dashboard

**Document Management:**
- View all uploaded documents
- Filter by type and device
- Delete documents
- View OCR processing status

**Source Management:**
- Add new search sources
- Toggle source status
- Track last scrape time
- Delete sources

**Analytics:**
- User statistics
- Query tracking
- Fault discovery monitoring

### 6. Notification System

**Notification Types:**
- New fault discovered
- File uploaded
- Search source failures
- Subscription expiring
- System alerts

**Features:**
- Owner notifications for important events
- User notifications for personal actions
- Read/unread tracking
- Automatic cleanup of old notifications

---

## API Routes

### Authentication
- `auth.me` - Get current user
- `auth.logout` - Logout user

### Documents
- `documents.upload` - Upload and process document
- `documents.list` - Get user's documents
- `documents.get` - Get document details
- `documents.delete` - Delete document

### Faults
- `faults.analyze` - AI-powered fault analysis
- `faults.search` - Search knowledge base
- `faults.rateFault` - Rate solution helpfulness
- `faults.getSuggestions` - Get related faults

### Search
- `search.searchSources` - Search all configured sources
- `search.getSources` - Get available sources

### Subscriptions
- `subscriptions.getStatus` - Get subscription status
- `subscriptions.getPricing` - Get pricing information
- `subscriptions.createPayPalOrder` - Create payment order
- `subscriptions.capturePayment` - Process payment
- `subscriptions.verifyPayment` - Verify payment status

### Admin
- `admin.getSources` - Get all search sources
- `admin.addSource` - Add new source
- `admin.toggleSource` - Enable/disable source
- `admin.deleteSource` - Delete source
- `admin.getStats` - Get system statistics

---

## User Interface

### Pages

1. **Home Page** (`/`)
   - Landing page with feature overview
   - Call-to-action buttons
   - Pricing information

2. **Chat Interface** (`/chat`)
   - Device information input
   - Interactive chat area
   - Real-time fault analysis
   - Web search integration

3. **Pricing Page** (`/pricing`)
   - Subscription tier display
   - Feature comparison
   - Payment processing
   - FAQ section

4. **Admin Dashboard** (`/admin`)
   - Document management
   - Source management
   - Analytics display
   - System settings

### Design System

**Art Deco Styling:**
- Deep black background (#050505)
- Metallic gold accents (#D4AF37 equivalent)
- Playfair Display for headlines
- Cormorant Garamond for body text
- Geometric ornamentation and stepped lines

**Components:**
- Art Deco cards with decorative borders
- Custom buttons with hover effects
- Gradient dividers
- Smooth animations

---

## Security & Privacy

### Authentication
- Manus OAuth integration
- Session-based authentication
- Role-based access control (admin/user)

### Data Protection
- S3 storage for file content
- Database encryption for sensitive data
- Secure PayPal integration
- HTTPS-only connections

### Privacy Compliance
- Robots.txt compliance for web scraping
- Respect for website terms of service
- User data isolation
- Audit trail via query history

---

## Environment Variables

**Required:**
- `DATABASE_URL` - MySQL/TiDB connection string
- `JWT_SECRET` - Session cookie signing secret
- `VITE_APP_ID` - Manus OAuth application ID
- `OAUTH_SERVER_URL` - Manus OAuth backend URL
- `OWNER_OPEN_ID` - Owner's Manus OpenID
- `PAYPAL_CLIENT_ID` - PayPal API client ID
- `PAYPAL_CLIENT_SECRET` - PayPal API secret

**Optional:**
- `VITE_FRONTEND_URL` - Frontend URL for PayPal redirects
- `LLM_API_KEY` - LLM API key (if using external service)

---

## Development Workflow

### Setup
```bash
cd /home/ubuntu/ABCompuMed
pnpm install
pnpm db:push
pnpm dev
```

### Database Migrations
```bash
# Generate and run migrations
pnpm db:push

# Check schema
pnpm db:studio
```

### Testing
```bash
# Run tests
pnpm test

# Check TypeScript
pnpm check

# Format code
pnpm format
```

### Build & Deploy
```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

---

## Deployment

### Manus Platform
The application is designed for deployment on Manus platform with:
- Automatic SSL/TLS
- Custom domain support
- Built-in analytics
- Managed database
- S3 storage integration

### Configuration
1. Set environment variables in Manus Settings
2. Configure custom domain if needed
3. Set up PayPal credentials
4. Configure initial search sources

---

## Troubleshooting

### Common Issues

**OCR Processing Fails:**
- Check file format and size
- Ensure image quality is sufficient
- Verify Tesseract.js installation

**Web Search Returns No Results:**
- Verify search source URLs are accessible
- Check robots.txt compliance
- Ensure source is enabled in admin panel

**PayPal Integration Issues:**
- Verify API credentials are correct
- Check PayPal sandbox vs. production mode
- Ensure return URLs are configured

**Database Connection Errors:**
- Verify DATABASE_URL is correct
- Check database server is running
- Ensure SSL certificates are valid

---

## Future Enhancements

1. **Diagram Generation** - Automatic technical diagrams from fault descriptions
2. **Spare Parts Marketplace** - Integrated supplier links and pricing
3. **Mobile App** - Native iOS/Android applications
4. **API for Partners** - Third-party integration capabilities
5. **Advanced Analytics** - Predictive maintenance insights
6. **Multi-language Support** - Localization for global users

---

## Support

**Email:** Support@abcompumed.shop  
**Hours:** 24/7 automated support via chat  
**Premium Support:** Available for corporate tier subscribers

---

## License

ABCompuMed © 2024. All rights reserved.

---

## Version History

**v1.0.0** - Initial Release
- Core AI agent functionality
- Document processing with OCR
- Web search integration
- Subscription system
- Admin dashboard
- Notification system

---

*Last Updated: December 2024*
