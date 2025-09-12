# External APIs

## Alpha Vantage API

- **Purpose:** Real-time and historical stock price data
- **Documentation:** https://www.alphavantage.co/documentation/
- **Base URL(s):** https://www.alphavantage.co/query
- **Authentication:** API key parameter
- **Rate Limits:** 5 calls per minute (free tier)

**Key Endpoints Used:**
- `GET /query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={key}` - Current stock price

**Integration Notes:** Implement exponential backoff for rate limit handling. Cache responses for 30 seconds to minimize API calls during development.

## CoinGecko API

- **Purpose:** Cryptocurrency price data and market information
- **Documentation:** https://www.coingecko.com/en/api
- **Base URL(s):** https://api.coingecko.com/api/v3
- **Authentication:** No API key required for basic tier
- **Rate Limits:** 10-50 calls/minute (generous free tier)

**Key Endpoints Used:**
- `GET /simple/price?ids={coin_id}&vs_currencies=usd` - Current crypto price

**Integration Notes:** More generous rate limits than Alpha Vantage. Use coin IDs (bitcoin, ethereum) rather than symbols.

## Twilio WhatsApp API

- **Purpose:** WhatsApp message delivery for price alert notifications
- **Documentation:** https://www.twilio.com/docs/whatsapp
- **Base URL(s):** https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
- **Authentication:** Basic auth with Account SID and Auth Token
- **Rate Limits:** 1 message/second (sandbox), higher for production

**Key Endpoints Used:**
- `POST /Messages.json` - Send WhatsApp message

**Integration Notes:** Use Sandbox for development with pre-approved numbers. Production requires WhatsApp Cloud API migration.
