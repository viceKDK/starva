# Requirements

## Functional Requirements

**FR1:** The system shall allow users to create price alerts by specifying: asset symbol, asset type (stock/crypto), condition type (≥ or ≤), and threshold price value.

**FR2:** The system shall provide a web interface to list all configured alerts showing asset, condition, threshold, and current status (active/inactive).

**FR3:** The system shall allow users to activate/deactivate individual alerts without deleting them.

**FR4:** The system shall allow users to permanently delete alerts they no longer need.

**FR5:** The system shall automatically check current prices for all active alerts at configurable intervals (1-5 minutes).

**FR6:** The system shall send WhatsApp messages when price conditions are met, including: asset name/symbol, current price, triggered condition, and timestamp.

**FR7:** The system shall implement configurable anti-spam protection with cooldown period (default: 3 hours) after each alert triggers to prevent duplicate messages.

**FR8:** The system shall track the last trigger time for each alert to manage cooldown periods.

**FR9:** The system shall support only stocks and cryptocurrency asset types.

**FR10:** The system shall persist all alert configurations in a local SQLite database.

**FR11:** The system shall load configuration from environment variables (.env file) including API keys, notification settings, and cooldown duration.

## Non-Functional Requirements

**NFR1:** The system shall use only free-tier APIs (Alpha Vantage for stocks, CoinGecko for crypto) to maintain zero operational cost.

**NFR2:** The system shall run as a local server accessible only from localhost to ensure security and privacy.

**NFR3:** The system shall have minimal resource consumption suitable for running continuously on a personal computer.

**NFR4:** The system shall deliver WhatsApp notifications within 1 minute of price condition triggers.

**NFR5:** The system shall maintain 99% uptime when the host computer is running and connected to internet.

**NFR6:** The system shall handle API rate limits gracefully without crashing or losing functionality.

**NFR7:** The system shall store sensitive data (API keys) securely and never log or expose them.
