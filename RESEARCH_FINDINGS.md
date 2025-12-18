# ABCompuMed - Research Findings: Free LLM APIs and Web Scraping

## Phase 3 Research Summary

### Free LLM APIs Suitable for Medical Device Analysis

#### Top 5 Recommended Providers (2025)

| Provider | Key Features | Free Tier | Best For |
|----------|-------------|-----------|----------|
| **Google AI Studio (Gemini)** | 1M tokens/min, no credit card | 15 requests/min | High-volume analysis, document processing |
| **Groq** | 300+ tokens/sec, ultra-fast | Generous free tier | Real-time queries, fast inference |
| **DeepSeek V3** | 77.9% MMLU, 128K context | Free API available | Complex reasoning, fault analysis |
| **Llama 4 Scout** | 10M token context window | Free tier available | Entire manuals, full catalogs in single request |
| **Together AI** | $25 free credits, multimodal | Generous free tier | Specialized analysis, image processing |

#### Recommended Multi-Provider Strategy

**Primary Stack:**
1. **Google Gemini 2.5 Flash** - Main workhorse for document analysis and fault classification
2. **Groq (Llama 3.3 70B)** - Fast inference for real-time chat responses
3. **DeepSeek V3** - Complex reasoning for root cause analysis
4. **Llama 4 Scout** - Long-context processing for entire maintenance manuals

**Fallback:**
- OpenRouter - Flexible backup with multiple model access

#### Implementation Approach

- **Caching Strategy**: Implement 60%+ cache hit rate for repeated queries (saves 60% of API calls)
- **Rate Limiting**: Respect free tier limits with queue management
- **Cost Optimization**: Use lightweight models (Gemma 3 27B) for simple classifications, reserve heavy models for complex analysis

### Web Scraping Libraries for Node.js

#### Recommended Technology Stack

| Layer | Library | Purpose | Why Choose |
|-------|---------|---------|------------|
| **HTTP Client** | Got Scraping | Fetch web content | Anti-bot evasion, browser-like headers |
| **HTML Parser** | Cheerio | Parse static HTML | jQuery-like syntax, fast, lightweight |
| **Browser Automation** | Playwright | Dynamic content | JavaScript rendering, reliable, modern |
| **Full Framework** | Crawlee | Complete scraping | CheerioCrawler + PuppeteerCrawler integration |

#### Implementation Strategy

**For Static Content (Forums, Catalogs):**
```
Got Scraping + Cheerio + header-generator
- Lightweight and fast
- Handles anti-scraping measures
- Respects robots.txt
```

**For Dynamic Content (JavaScript-heavy sites):**
```
Playwright + Cheerio
- Renders JavaScript
- Waits for dynamic content
- Handles complex interactions
```

**For Large-Scale Scraping:**
```
Crawlee
- Built-in retry logic
- Proxy support
- Session management
- Respects rate limits
```

### OCR and Document Processing

**Recommended Approach:**
- Use Tesseract.js (JavaScript) for client-side OCR of uploaded images
- Use Manus built-in LLM with vision capabilities for document analysis
- Store extracted text in database for searchability

### Architecture Recommendations

1. **LLM Integration**: Multi-provider with intelligent routing
   - Simple queries → Google Gemini (fast, cheap)
   - Complex analysis → DeepSeek V3 (reasoning)
   - Long documents → Llama 4 Scout (10M context)

2. **Web Scraping**: Hybrid approach
   - Admin-configured sources → Scheduled Crawlee jobs
   - User-provided sources → On-demand Playwright scraping
   - Forum interactions → Session-based authentication

3. **Document Processing**: Pipeline approach
   - Upload → S3 storage
   - OCR extraction → Tesseract.js + LLM vision
   - Analysis → LLM document understanding
   - Storage → Database + full-text search

### Privacy and Ethics Compliance

- **robots.txt Compliance**: Check before scraping each domain
- **Rate Limiting**: Implement delays between requests
- **User-Agent**: Identify as ABCompuMed crawler
- **Terms of Service**: Display source attribution
- **Data Retention**: Clear policy on how long scraped data is kept

### Cost Estimation (Monthly)

**Scenario: 1000 queries/month, 500 document uploads**

| Component | Cost |
|-----------|------|
| LLM APIs (free tier) | $0 |
| Web scraping (free tier) | $0 |
| S3 storage (1GB) | ~$0.02 |
| Database | Included in Manus |
| **Total** | **~$0.02** |

**Scaling to 10,000 queries/month:**
- Still mostly free tier coverage
- Minimal paid tier usage
- Total cost: ~$5-10/month

### Next Steps

1. Implement Google Gemini API integration first (easiest setup)
2. Add Groq for fast inference
3. Implement Cheerio + Got Scraping for forum scraping
4. Add Playwright for dynamic content
5. Build Crawlee-based scheduled scraping for admin sources
