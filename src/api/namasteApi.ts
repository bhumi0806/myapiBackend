import axios from "axios";

const API_BASE = "http://localhost:3000";

export async function autocomplete(query: string) {
  const res = await axios.get(`${API_BASE}/autocomplete?q=${query}`);
  return res.data;
}

export async function translate(body: any) {
  const res = await axios.post(`${API_BASE}/translate`, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer demo-token",
    },
  });
  return res.data;
}
