import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mode, secret, name, ram } = req.body || {};

    if (!mode || !secret || !name || !ram) {
      return res.status(400).json({ error: "Semua field harus diisi." });
    }

    const normalize = (s) => (s || "").toLowerCase().replace(/\s|_/g, "");

    const privateKey = normalize(process.env.PRIVATE_SECRET_KEY);
    const publicKey = normalize(process.env.PUBLIC_SECRET_KEY);
    const inputKey = normalize(secret);

    if (mode === "private" && inputKey !== privateKey)
      return res.status(403).json({ error: "Secret Key Private salah!" });
    if (mode === "public" && inputKey !== publicKey)
      return res.status(403).json({ error: "Secret Key Public salah!" });

    const prefix = mode === "private" ? "PRIVATE" : "PUBLIC";
    const domain = process.env[`${prefix}_PTERO_DOMAIN`];
    const apiKey = process.env[`${prefix}_PTERO_API_KEY`];
    const egg = process.env[`${prefix}_EGG_ID`];
    const location = process.env[`${prefix}_LOCATION_ID`];
    const disk = process.env[`${prefix}_DISK`];
    const cpu = process.env[`${prefix}_CPU`];
    const ramMb = parseInt(ram) * 1024;

    const response = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        user: 1,
        egg: Number(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: "npm start",
        limits: {
          memory: ramMb === 0 ? 0 : ramMb,
          swap: 0,
          disk: Number(disk),
          io: 500,
          cpu: Number(cpu),
        },
        feature_limits: {
          databases: 2,
          backups: 2,
          allocations: 1,
        },
        deploy: {
          locations: [Number(location)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "Gagal membuat server",
        detail: data,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Server berhasil dibuat!",
      server: data,
    });
  } catch (err) {
    return res.status(500).json({ error: "Kesalahan server", detail: err.message });
  }
}
