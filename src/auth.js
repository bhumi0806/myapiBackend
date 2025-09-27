// src/auth.js
const axios = require('axios');

async function verifyAbhaToken(token) {
  const introspect = process.env.ABHA_INTROSPECT_URL;
  if (!introspect) {
    // Demo mode: accept token but warn
    console.warn('ABHA_INTROSPECT_URL not set — running in demo auth mode; do not use in production');
    return { active: true, abha: 'demo-user' };
  }
  try {
    const resp = await axios.post(introspect, { token }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.ABHA_CLIENT_ID}:${process.env.ABHA_CLIENT_SECRET}`).toString('base64')}`
      }
    });
    return resp.data;
  } catch (err) {
    console.error('ABHA token introspection failed', err.response && err.response.data || err.message);
    throw err;
  }
}

function authMiddleware() {
  return async (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Bearer token' });
    }
    const token = auth.split(' ')[1];
    try {
      const info = await verifyAbhaToken(token);
      if (!info || !info.active) return res.status(401).json({ error: 'Invalid ABHA token' });
      req.abha = { id: info.sub || info.abha || 'unknown' };
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Token verification failed' });
    }
  };
}
module.exports = { authMiddleware, verifyAbhaToken };
