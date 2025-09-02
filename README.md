# Instagram Post Automation 🚀

_Automate, schedule, and optimize your Instagram video content pipeline._

---

## Overview

**Instagram Post Automation** is a production-ready **Node.js application** that streamlines the process of downloading, transcoding, captioning, and publishing short-form videos (e.g., TikTok, Twitter/X) to Instagram Reels.

Built for **content creators, agencies, and social media managers**, it eliminates repetitive workflows, ensures brand consistency, and enables **multi-account scheduling at scale**.

---

## Features

- **Multi-Source Ingestion** – Download from Twitter/X and TikTok with automatic detection.
- **Automated Transcoding** – Normalize format, aspect ratio, and duration for Reels.
- **Dynamic Captioning** – Use custom, default, or source-extracted captions with smart wrapping.
- **Branding Support** – Overlay logos and apply video templates.
- **Multi-Account Scheduling** – Manage posts across accounts with independent configs.
- **Cloudflare Tunnel Integration** – Securely expose local server for Graph API callbacks.
- **SQLite Queue Management** – Track, schedule, and audit media posts.
- **Modular & Extensible** – Add new sources, presets, or integrations easily.
- **CLI Utilities** – Import, query, and manage the queue directly from the terminal.
- **Graph API Polling** – Monitors upload status and retries failed posts automatically.

---

## Tech Stack

- **Node.js** – runtime
- **Express** – API server
- **SQLite** – queue database
- **Fluent-ffmpeg** – video processing
- **yt-dlp** – media downloading
- **Cloudflare Tunnel** – secure endpoint
- **Docker** – containerization (optional)
- **PostgreSQL** – scalable relational database for production deployments (optional)
- **Axios** – HTTP client
- **dotenv** – environment management
- **Instagram Graph API** – posting and scheduling

---

## Architecture

    +-------------------+       +-------------------+       +-------------------+
    |   Media Sources   | --->  |  Download & Queue | --->  | Transcode/Upload  |
    | (TikTok, Twitter) |       | (SQLite, yt-dlp)  |       | (ffmpeg, IG API)  |
    +-------------------+       +-------------------+       +-------------------+
                                      |                           |
                                      v                           v
                             +-------------------+       +-------------------+
                             |  Express Server   | <---- | Cloudflare Tunnel |
                             +-------------------+       +-------------------+
                                                              |
                                                              v
                                                   +-----------------------+
                                                   | Instagram Graph API   |
                                                   | (Upload + Polling)    |
                                                   +-----------------------+

- **Sources:** URLs ingested via CSV or API.
- **Download & Queue:** Media fetched and tracked in SQLite.
- **Transcode/Upload:** Processed and prepared for Instagram.
- **Express Server:** Handles API requests and webhook callbacks.
- **Cloudflare Tunnel:** Provides secure public URL for Graph API callbacks.
- **Instagram Graph API:**
  - Uploads media via `media` endpoints.
  - Uses **status polling** to check upload progress and retries on failures.
  - Finalizes publishing with `media_publish`.
  - Supports scheduling via `creation_id` + `publish_time`.

---

## Getting Started

1. **Clone the repository**

   git clone https://github.com/yourusername/instagram-post-automation.git
   cd instagram-post-automation

2. **Install dependencies**

   npm install

3. **Install system dependencies (binaries on PATH)**

   ffmpeg
   yt-dlp
   cloudflared

4. **Configure environment variables**

   cp .env.example .env

   # then edit .env as needed

5. **Initialize the database**

   node db/setup.js ./db/yourdbname.db

6. **Start the server and tunnel**

   node start.js

---

## Usage

**Import media from CSV**

    node importCsv.js ./db/yourdbname.db

**Query all media**

    node queryAll.js ./db/yourdbname.db

**Run the automation loop**

    node start.js

**Example SQL insert**

    INSERT INTO media_queue (source, url, caption_strategy, caption_custom)
    VALUES ('twitter', 'https://twitter.com/xyz/status/123', 'custom', 'Check this out!');

---

## Configuration

**.env variables**

- `DB_PATH` – SQLite DB path
- `IG_ACCESS_TOKEN` – Instagram Graph API token
- `IG_USER_ID` – Instagram user ID
- `CLOUDFLARE_PUBLIC_URL` – Callback endpoint
- `LOGO_PATH` – Logo overlay path (optional)
- `CAPTION` – Default caption text

**accounts.json**

- Define multiple IG accounts with separate credentials & settings.

**Cloudflare Tunnel**

- Run `cloudflared tunnel login` to authenticate and configure.

---

## Instagram Graph API Setup

This project uses the **Instagram Graph API** to publish Reels. To set it up:

1.  **Create a Facebook App**

    - Go to [Meta for Developers](https://developers.facebook.com/apps/).
    - Create a new app and add the **Instagram Graph API** product.

2.  **Connect an Instagram Business Account**

    - Link your Instagram account to a Facebook Page.
    - Convert it to a **Business** or **Creator** account.

3.  **Generate an Access Token**

    - Use the Graph API Explorer or your app dashboard to generate a **long-lived token**.
    - Add it to `.env` as `IG_ACCESS_TOKEN`.

4.  **Get Your User ID**

    - Call:

          GET https://graph.facebook.com/me/accounts?access_token=YOUR_TOKEN

    - Copy the Instagram user ID and set it in `.env` as `IG_USER_ID`.

5.  **Enable Webhooks (Optional)**

    - Configure webhook subscriptions for `instagram_manage_insights` and `instagram_content_publish`.
    - Use Cloudflare Tunnel to expose your local Express server to the API.

6.  **How Posting Works in This Project**

    - Uploads video using:

          POST /{ig-user-id}/media

    - Polls the `status_code` until it’s `FINISHED`.
    - Publishes via:

          POST /{ig-user-id}/media_publish?creation_id={id}

    - If upload fails, the queue system retries automatically.

---

## Testing

**Unit tests**

    npm test

**Integration tests**

- See `/test` directory for sample scripts.

---

## Deployment

**Local**

- Run `node start.js` with Cloudflare tunnel running.

**Docker**

- Use the included `Dockerfile`.

**Cloud**

- Deploy to SAP BTP, AWS, or any VM with Cloudflare tunnel for public access.

---

## Contributing

- **Pull Requests:** Fork → branch → PR with description.
- **Style:** Follow StandardJS / existing conventions.
- **Branches:**
  - `main` – production
  - `dev` – staging
  - `feature/*` – new work

---

## Roadmap

- [ ] Web UI for queue management + analytics
- [ ] Support YouTube Shorts & Instagram ingestion
- [ ] Advanced scheduling & retries
- [ ] AI-powered caption generation
- [ ] Multi-language support
- [ ] Cloud storage integration (S3, Azure Blob)

---

## License

[MIT](LICENSE)

---

## Contact

👤 **Brendan MacDonald**

- GitHub: https://github.com/yourusername
- LinkedIn: https://linkedin.com/in/yourprofile
- Email: macdonald.brendan@outlook.com
