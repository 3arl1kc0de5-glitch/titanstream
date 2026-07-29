# Document Q: Infrastructure Architecture

This document defines the container layout, reverse proxy configurations, SSL termination, and horizontal scaling strategies for production deployment on a Linux VPS.

---

## 1. Container Architecture (Docker Compose Specification)

The production environment isolates microservices into separate containers coordinated by a private Docker network.

```
                  +-----------------------------------+
                  |             Host VPS              |
                  |                                   |
                  |     +-----------------------+     |
                  |     |       Nginx           |     |
                  |     | (Port 80/443 exposed) |     |
                  |     +-----------+-----------+     |
                  |                 |                 |
+-----------------|-----------------|-----------------|-----------------+
| Private Docker  |                 v                 |                 |
| Network         |     +-----------------------+     |                 |
|                 |     |     NestJS API        |     |                 |
|                 |     |   (Stateless Pods)    |     |                 |
|                 |     +-----+-----------+-----+     |                 |
|                 |           |           |           |                 |
|                 v           v           v           v                 |
|           +-------------------+       +-------------------+           |
|           |    PostgreSQL     |       |    Redis cache    |           |
|           +-------------------+       +---------+---------+           |
|                                                 |                     |
|                                                 v                     |
|                                       +-------------------+           |
|                                       |   NestJS Worker   |           |
|                                       +-------------------+           |
+-----------------------------------------------------------------------+
```

---

## 2. Nginx Reverse Proxy Configuration

Nginx serves as the single ingress controller. It handles HTTPS SSL termination and routes traffic to the correct container endpoint.

```nginx
# nginx.conf
user nginx;
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    # Upstream servers for load balancing
    upstream api_servers {
        server api:3000;
    }

    server {
        listen 80;
        server_name api.titanstream.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.titanstream.com;

        ssl_certificate /etc/letsencrypt/live/titanstream.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/titanstream.com/privkey.pem;

        # Static Client Assets
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 7d;
            add_header Cache-Control "public, no-transform";
        }

        # API Routing
        location /api/ {
            proxy_pass http://api_servers;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

## 3. Environment Segregations

Configuration values are parsed at runtime using NestJS `ConfigService`.

* **`DATABASE_URL`:** PostgreSQL connection pool string.
* **`REDIS_URL`:** Redis server endpoint.
* **`TELEGRAM_BOT_TOKEN`:** Token used to sign WebApp requests and send push alerts.
* **`JWT_SECRET` / `REFRESH_SECRET`:** Cryptographic signatures for access tokens.
* **`TON_RPC_URL` / `BSC_RPC_URL`:** Blockchain node endpoints.
* **`ENCRYPTION_KEY`:** 32-byte key used to encrypt wallet credentials.

---

## 4. Scaling Strategy & Health Checks

* **Horizontal Scaling:**
  * The NestJS API containers are stateless. Adding more instances (e.g. running `docker compose up --scale api=3 -d`) allows Nginx to load-balance traffic across multiple nodes.
  * In-memory cache is centralized in Redis, ensuring session consistency across different API container instances.
* **Health Checks:**
  * Every API node implements `/api/v1/health` using NestJS Terminus.
  * Checks: verifies DB connectivity and Redis latency.
  * If a container fails the health check for 3 consecutive polls (every 10 seconds), Nginx drops the node from the load-balancer pool.
