# Database Schema

This document outlines the database schema for the **ETGenAIHackathon** project. The schema is designed to manage user profiles, watchlists, market news (with sector and stock impact), notifications, and user-defined alerts.

## Entity Relationship Diagram

```mermaid
erDiagram
    profiles ||--o{ watchlists : "has"
    profiles ||--o{ notifications : "receives"
    profiles ||--o{ alerts : "sets"
    watchlists ||--o{ watchlist_items : "contains"
    news ||--o{ news_sectors : "impacts"
    news ||--o{ news_stocks : "mentions"
    mf_schemes ||--o{ mf_nav_history : "has price"

    profiles {
        uuid id PK
        text email
        timestamp created_at
    }

    watchlists {
        uuid id PK
        uuid user_id FK
        text name
        timestamp created_at
    }

    watchlist_items {
        uuid id PK
        uuid watchlist_id FK
        text symbol
        timestamp added_at
    }

    news {
        uuid id PK
        text title
        text summary
        text source
        text url
        timestamp published_at
        timestamp created_at
        text sentiment
        text impact_summary
        jsonb raw_json
    }

    news_sectors {
        uuid id PK
        uuid news_id FK
        text sector
        text impact
    }

    news_stocks {
        uuid id PK
        uuid news_id FK
        text symbol
        text impact
        double relevance_score
    }

    notifications {
        uuid id PK
        uuid user_id FK
        text title
        text message
        boolean is_read
        timestamp created_at
    }

    alerts {
        uuid id PK
        uuid user_id FK
        text symbol
        jsonb condition
        boolean is_triggered
        timestamp created_at
        timestamp triggered_at
    }
    
    mf_schemes {
        text scheme_code PK
        text scheme_name
        text amc_name
        text scheme_category
        timestamp last_updated
    }

    mf_nav_history {
        bigint id PK
        text scheme_code FK
        decimal nav
        date nav_date
    }
```

---

## Table Definitions

### `profiles`
Stores user profile information. Linked to `auth.users` in the authentication provider.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `FK` | Unique identifier (matches `auth.users.id`). |
| `email` | `text` | | User's email address. |
| `created_at` | `timestamp` | `DEFAULT now()` | Timestamp when the profile was created. |

### `watchlists`
User-created lists to track multiple stocks.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier for the watchlist. |
| `user_id` | `uuid` | `FK (profiles.id)` | Owner of the watchlist. |
| `name` | `text` | `NOT NULL` | Name of the watchlist. |
| `created_at` | `timestamp` | `DEFAULT now()` | Creation timestamp. |

### `watchlist_items`
Individual stocks/tickers within a watchlist.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier. |
| `watchlist_id` | `uuid` | `FK (watchlists.id)` | Parent watchlist. |
| `symbol` | `text` | `NOT NULL` | Stock ticker symbol (e.g., AAPL). |
| `added_at` | `timestamp` | `DEFAULT now()` | When the item was added. |

### `news`
Aggregated financial news records.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier. |
| `title` | `text` | | Article headline. |
| `summary` | `text` | | AI-generated or source-provided summary. |
| `source` | `text` | | News outlet name. |
| `url` | `text` | | Link to the original article. |
| `published_at`| `timestamp` | | Original publication time. |
| `created_at` | `timestamp` | `DEFAULT now()` | Ingestion timestamp. |
| `sentiment` | `text` | | Overall sentiment (e.g., Bullish, Bearish). |
| `impact_summary`| `text` | | Brief summary of potential market impact. |
| `raw_json` | `jsonb` | | Complete raw data from the provider. |

### `news_sectors`
Mapping of news articles to affected market sectors.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier. |
| `news_id` | `uuid` | `FK (news.id)` | Associated news article. |
| `sector` | `text` | | Impacted sector name. |
| `impact` | `text` | | Type of impact (e.g., High, Low). |

### `news_stocks`
Mapping of news articles to specific stock symbols.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier. |
| `news_id` | `uuid` | `FK (news.id)` | Associated news article. |
| `symbol` | `text` | `NOT NULL` | Stock ticker symbol. |
| `impact` | `text` | | Predicted impact direction. |
| `relevance_score`| `double` | | Logic-based relevance to the article. |

### `notifications`
Alerts and messages sent to users.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier. |
| `user_id` | `uuid` | `FK (profiles.id)` | Recipient user. |
| `title` | `text` | | Notification title. |
| `message` | `text` | | Full message content. |
| `is_read` | `boolean` | `DEFAULT false` | Read status. |
| `created_at` | `timestamp` | `DEFAULT now()` | Timestamp. |

### `alerts`
Custom user-defined price or condition alerts.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier. |
| `user_id` | `uuid` | `FK (profiles.id)` | Owner of the alert. |
| `symbol` | `text` | `NOT NULL` | Target stock symbol. |
| `condition` | `jsonb` | `NOT NULL` | Logic for triggering the alert. |
| `is_triggered` | `boolean` | `DEFAULT false` | Current status. |
| `created_at` | `timestamp` | `DEFAULT now()` | Alert creation time. |
| `triggered_at` | `timestamp` | | Most recent trigger time. |

### `chat_history`
Persisted chatbot conversations and session metadata.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier for the message. |
| `user_id` | `uuid` | `FK (profiles.id)`, `NOT NULL` | Message owner. |
| `session_id` | `uuid` | `NOT NULL`, `DEFAULT random` | Groups messages into a single chat. |
| `role` | `text` | `CHECK (role IN ('user', 'assistant'))` | Message source. |
| `content` | `text` | `NOT NULL` | Textual content. |
| `metadata` | `jsonb` | `DEFAULT '{}'` | Extracted tickers, charts, sentiment. |
| `created_at` | `timestamp` | `DEFAULT now()` | Sent timestamp. |

### `mf_schemes`
The central registry for all Indian mutual fund schemes (sourced from AMFI).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `scheme_code` | `text` | `PK` | Unique AMFI scheme identifier. |
| `scheme_name` | `text` | `NOT NULL` | Full name of the fund. |
| `amc_name` | `text` | | Name of the Asset Management Company. |
| `scheme_category`| `text` | | Fund category (e.g., Equity: Large Cap). |
| `last_updated` | `timestamp` | | Time of last regulatory sync. |

### `mf_nav_history`
Historical price (NAV) data for mutual funds.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `bigint` | `PK` | Unique record identifier. |
| `scheme_code` | `text` | `FK (mf_schemes)` | Associated scheme. |
| `nav` | `decimal` | `NOT NULL` | Net Asset Value on the given date. |
| `nav_date` | `date` | `NOT NULL` | The date for which NAV is recorded. |

### `portfolios`
Manual and persistent user holdings for Stocks and Mutual Funds.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique holding identifier. |
| `user_id` | `uuid` | `FK (profiles.id)`, `NOT NULL` | The owner of the holding. |
| `symbol` | `text` | `NOT NULL` | Ticker (e.g., RELIANCE.NS) or Scheme Code. |
| `asset_type` | `text` | `CHECK (asset_type IN ('stock', 'mf'))` | Type of asset. |
| `quantity` | `double precision` | `NOT NULL` | Number of units held. |
| `avg_cost` | `double precision` | `NOT NULL` | Average buy price per unit. |
| `isin` | `text` | | International Securities Identification Number (for MFs). |
| `created_at` | `timestamp` | `DEFAULT now()` | Record creation time. |

---

> [!NOTE]
> This schema is primarily managed via a Supabase-compatible PostgreSQL backend. Foreign keys are enforced at the database level to ensure data integrity.
