// src/icdClient.js
const axios = require('axios');
const WHO_BASE = 'https://icd.who.int/icdapi'; // change in .env if needed
const WHO_API_VERSION = process.env.WHO_API_VERSION || 'v2';
const WHO_API_KEY = process.env.WHO_API_KEY || 'f77cec41-00ea-425d-88f4-cad1c2612de2_c7682e52-5689-4492-8a0c-d60f837f4900';
async function searchICD(query, releaseId='2025-01', linearization='mms') {
  const url = `${WHO_BASE}/v2/search`;
  const params = { q: query, releaseId, linearization, pageSize: 20 };
  const headers = {
    'API-Version': WHO_API_VERSION,
    'Accept-Language': process.env.WHO_ACCEPT_LANGUAGE || 'en'
  };
  if (WHO_API_KEY) headers['Authorization'] = `Bearer ${WHO_API_KEY}`;
  const resp = await axios.get(url, { params, headers });
  return resp.data;
}

async function getEntity(id, releaseId='2025-01') {
  const url = `${WHO_BASE}/v2/entity/${id}`;
  const headers = {
    'API-Version': WHO_API_VERSION,
    'Accept-Language': process.env.WHO_ACCEPT_LANGUAGE || 'en'
  };
  if (WHO_API_KEY) headers['Authorization'] = `Bearer ${WHO_API_KEY}`;
  const resp = await axios.get(url, { params: { releaseId }, headers });
  return resp.data;
}

module.exports = { searchICD, getEntity };
