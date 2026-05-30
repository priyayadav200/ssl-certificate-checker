# SSL Certificate Checker

A web-based tool that checks SSL/TLS certificate status for any website. Enter a domain and get certificate details, security grade, expiry countdown, issuer info, cipher suite, and the full certificate chain — all in one place.

![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## What It Does

- **Certificate Validation** — Checks if the SSL certificate is valid, expired, or misconfigured
- **Security Grading** — Grades the certificate from A+ to F based on expiry days and TLS protocol version
- **Expiry Tracking** — Shows days remaining with a visual countdown ring
- **Issuer Details** — Displays who issued the certificate (CA), organization, and country
- **Connection Security** — Shows TLS protocol version (TLSv1.2, TLSv1.3) and cipher suite being used
- **SAN List** — Lists all Subject Alternative Names (domains covered by the certificate)
- **Certificate Chain** — Shows the full trust chain from leaf certificate to root CA
- **Error Handling** — Gives clear error messages for DNS failures, connection refusals, and timeouts

---

## Tech Stack & Why I Used It

### Backend

| Technology | Why |
|---|---|
| **Node.js** | Non-blocking I/O is a good fit for network operations like TLS handshakes. The `tls` module is built into Node, so no external SSL libraries are needed. |
| **Express.js** | Lightweight HTTP framework. I only needed a POST endpoint and static file serving — Express handles both without overhead. |
| **tls (built-in)** | Node's native `tls` module lets you open a raw TLS socket, grab the peer certificate, and inspect every field (subject, issuer, SAN, fingerprint, chain). No third-party dependency needed. |
| **cors** | Enables cross-origin requests in case the frontend is served from a different origin during development. |

### Frontend

| Technology | Why |
|---|---|
| **Vanilla HTML/CSS/JS** | No build step, no bundler, no framework overhead. The UI is a single page with a form and result cards — React or Vue would be overkill here. |
| **CSS Custom Properties** | Makes theming consistent. All colors, radii, and shadows are defined in `:root` variables so changing the palette is a one-line edit. |
| **Fetch API** | Native browser API for making the POST request to the backend. No need for axios or jQuery. |
| **SVG Icons (inline)** | No icon library dependency. Each icon is a small inline SVG — keeps the page weight under 20KB total. |

### Architecture Decisions

- **No database** — This is a stateless checker. Each request does a live TLS handshake. No caching, no storage needed.
- **rejectUnauthorized: false** — The TLS connection is opened with this flag so the tool can inspect even expired or self-signed certificates instead of just rejecting them.
- **Server-side SSL check** — The TLS handshake happens on the backend (not in the browser) because browsers don't expose raw certificate details through JavaScript. The `tls` module gives access to the full cert object.
- **Grading logic** — The grade is calculated from two factors: days until expiry and TLS protocol version. TLSv1.3 with 30+ days remaining = A+. Expired = F. This is a simplified version of what tools like SSL Labs do.

---

## Project Structure

```
ssl-certificate-checker/
├── server.js            # Express server + TLS certificate checking logic
├── public/
│   ├── index.html       # Main page structure
│   ├── style.css        # All styles (Semrush-inspired white + orange theme)
│   └── app.js           # Frontend logic (form handling, API calls, rendering)
├── package.json
├── .gitignore
└── README.md
```

---

## How to Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/priya-yadav-dev/ssl-certificate-checker.git
cd ssl-certificate-checker

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open in browser
# http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

---

## API Endpoint

### POST `/api/check`

**Request:**
```json
{
  "domain": "google.com"
}
```

**Response:**
```json
{
  "hostname": "google.com",
  "isValid": true,
  "isExpired": false,
  "grade": "A+",
  "gradeLabel": "Excellent",
  "subject": {
    "commonName": "*.google.com",
    "organization": "Google LLC"
  },
  "issuer": {
    "commonName": "GTS CA 1C3",
    "organization": "Google Trust Services LLC"
  },
  "validity": {
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validTo": "2024-04-01T00:00:00.000Z",
    "daysRemaining": 72,
    "totalDays": 90
  },
  "protocol": "TLSv1.3",
  "cipher": {
    "name": "TLS_AES_256_GCM_SHA384"
  },
  "san": ["*.google.com", "google.com"],
  "issuerChain": [...]
}
```

---

## What I Learned

- How TLS handshakes work under the hood — the client connects, the server presents its certificate, and the client verifies the chain of trust
- The difference between `authorized` (chain validates against known CAs) and just "has a certificate" (self-signed certs pass the latter but not the former)
- How Subject Alternative Names work — a single certificate can cover dozens of domains
- Why `rejectUnauthorized: false` is fine for inspection tools but dangerous in production HTTP clients
- How certificate chains are structured — leaf → intermediate → root CA

---

## License

MIT
