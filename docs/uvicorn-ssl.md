# Uvicorn with SSL

Two common approaches:

---

## 1. Reverse proxy (recommended for production)

Let **Nginx** (or Caddy) handle SSL. Nginx has the certificate and terminates HTTPS; it proxies to uvicorn over HTTP on localhost. Uvicorn does not need SSL.

- **Forge:** Nginx already has your SSL cert (e.g. Let’s Encrypt). Your app runs as “Web directory” or “Proxy” pointing to `http://127.0.0.1:8005`. No uvicorn SSL needed.
- Uvicorn runs as usual:
  ```bash
  uvicorn backend.main:app --host 127.0.0.1 --port 8005
  ```
- Nginx config: `proxy_pass http://127.0.0.1:8005` and `proxy_set_header X-Forwarded-Proto $scheme` so the app sees the original scheme (https).

No cert on uvicorn; all SSL is at Nginx.

---

## 2. Uvicorn with SSL (direct HTTPS)

Use this when uvicorn is the only process and you want it to serve HTTPS (e.g. single server, no Nginx).

You need:
- A PEM **private key** file (e.g. `key.pem`)
- A PEM **certificate** file (e.g. `cert.pem`)

Run:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 443 \
  --ssl-keyfile=/path/to/key.pem \
  --ssl-certfile=/path/to/cert.pem
```

Or with a combined cert+key in one file:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 443 \
  --ssl-keyfile=/path/to/combined.pem \
  --ssl-certfile=/path/to/combined.pem
```

**Getting certs:**
- **Let’s Encrypt:** use certbot, then point `--ssl-certfile` at the fullchain and `--ssl-keyfile` at the privkey (e.g. under `/etc/letsencrypt/live/yourdomain/`). Run uvicorn as a user that can read those files (or copy to a safe path).
- **Self-signed (dev only):**
  ```bash
  openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
  ```

**Note:** On port 443 you typically need to run as root or use setcap/capabilities; many people prefer keeping uvicorn on a high port (e.g. 8005) and putting Nginx on 443 (option 1).
