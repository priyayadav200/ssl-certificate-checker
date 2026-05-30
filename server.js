const express = require('express');
const tls = require('tls');
const { URL } = require('url');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// strip protocol and path, return just hostname
function extractHostname(input) {
  let hostname = input.trim();

  // remove protocol if present
  if (hostname.startsWith('http://') || hostname.startsWith('https://')) {
    try {
      const parsed = new URL(hostname);
      hostname = parsed.hostname;
    } catch (err) {
      return null;
    }
  }

  // remove trailing slashes and paths
  hostname = hostname.split('/')[0];
  // remove port if someone typed it
  hostname = hostname.split(':')[0];

  if (!hostname || hostname.length < 3) return null;
  return hostname;
}

// grade the certificate based on days remaining and protocol
function gradeCertificate(daysRemaining, protocol) {
  if (daysRemaining <= 0) return { grade: 'F', label: 'Expired' };
  if (daysRemaining <= 7) return { grade: 'D', label: 'Critical' };
  if (daysRemaining <= 30) return { grade: 'C', label: 'Warning' };
  if (protocol === 'TLSv1.3') return { grade: 'A+', label: 'Excellent' };
  if (protocol === 'TLSv1.2') return { grade: 'A', label: 'Good' };
  return { grade: 'B', label: 'Okay' };
}

// connect via TLS and pull certificate details
function checkSSL(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(443, hostname, {
      servername: hostname,
      rejectUnauthorized: false, // we want to inspect even expired certs
      timeout: 8000
    }, () => {
      const cert = socket.getPeerCertificate(true);
      const authorized = socket.authorized;
      const protocol = socket.getProtocol();
      const cipher = socket.getCipher();

      if (!cert || !cert.subject) {
        socket.destroy();
        return reject(new Error('No certificate returned by the server'));
      }

      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      const now = new Date();
      const daysRemaining = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
      const totalDays = Math.floor((validTo - validFrom) / (1000 * 60 * 60 * 24));
      const isExpired = daysRemaining < 0;
      const isValid = authorized && !isExpired;

      const gradeInfo = gradeCertificate(daysRemaining, protocol);

      // build SAN list
      const sanList = [];
      if (cert.subjectaltname) {
        cert.subjectaltname.split(', ').forEach(entry => {
          const val = entry.replace('DNS:', '').trim();
          if (val) sanList.push(val);
        });
      }

      // issuer chain
      const issuerChain = [];
      let current = cert;
      const visited = new Set();
      while (current && current.issuerCertificate && !visited.has(current.fingerprint256)) {
        visited.add(current.fingerprint256);
        issuerChain.push({
          commonName: current.subject ? current.subject.CN : 'Unknown',
          organization: current.subject ? (current.subject.O || '') : '',
          issuer: current.issuer ? current.issuer.CN : 'Unknown'
        });
        if (current.issuerCertificate.fingerprint256 === current.fingerprint256) break;
        current = current.issuerCertificate;
      }
      // add the last one (root)
      if (current && current.subject && !visited.has(current.fingerprint256)) {
        issuerChain.push({
          commonName: current.subject.CN || 'Unknown',
          organization: current.subject.O || '',
          issuer: current.issuer ? current.issuer.CN : 'Self-signed'
        });
      }

      const result = {
        hostname: hostname,
        isValid: isValid,
        isExpired: isExpired,
        grade: gradeInfo.grade,
        gradeLabel: gradeInfo.label,
        subject: {
          commonName: cert.subject.CN || '',
          organization: cert.subject.O || '',
          locality: cert.subject.L || '',
          state: cert.subject.ST || '',
          country: cert.subject.C || ''
        },
        issuer: {
          commonName: cert.issuer.CN || '',
          organization: cert.issuer.O || '',
          country: cert.issuer.C || ''
        },
        validity: {
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          daysRemaining: daysRemaining,
          totalDays: totalDays
        },
        protocol: protocol || 'Unknown',
        cipher: cipher ? {
          name: cipher.name,
          version: cipher.version || protocol
        } : null,
        serialNumber: cert.serialNumber || '',
        fingerprint: cert.fingerprint256 || cert.fingerprint || '',
        san: sanList,
        issuerChain: issuerChain,
        checkedAt: new Date().toISOString()
      };

      socket.destroy();
      resolve(result);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timed out. Server took too long to respond.'));
    });

    socket.on('error', (err) => {
      socket.destroy();
      if (err.code === 'ENOTFOUND') {
        reject(new Error(`Domain "${hostname}" not found. Check the spelling and try again.`));
      } else if (err.code === 'ECONNREFUSED') {
        reject(new Error(`Connection refused by "${hostname}". Port 443 may not be open.`));
      } else if (err.code === 'ECONNRESET') {
        reject(new Error(`Connection reset by "${hostname}". The server closed the connection.`));
      } else {
        reject(new Error(err.message || 'Failed to connect'));
      }
    });
  });
}

// API endpoint
app.post('/api/check', async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Please enter a domain name' });
  }

  const hostname = extractHostname(domain);
  if (!hostname) {
    return res.status(400).json({ error: 'Invalid domain. Enter something like "google.com"' });
  }

  try {
    const result = await checkSSL(hostname);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SSL Checker running at http://localhost:${PORT}`);
});
