// Vercel Serverless Function
// Reads Kingdom 617 data and KVK history from MightPulse.
// KVK history is taken from the public Kingdom response's `kvk.cycles` data.

const API = "https://api.mightpulse.com/v1";
const WEB_API = "https://mightpulse.com/api";

async function readJson(response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function normalizeHistory(cycles) {
  if (!Array.isArray(cycles)) return [];

  return cycles
    .filter(row => row && (row.season != null || row.opponent_kid != null))
    .map(row => ({
      opponent_kid: Number(row.opponent_kid ?? 0),
      prep: row.prep || "",
      castle: row.castle || "",
      result: row.result || "",
      label: row.label || "",
      season: Number(row.season ?? 0),
      appointed_at: Number(row.appointed_at ?? 0),
      nick_name: row.nick_name || "—",
      alliance_abbr: row.alliance_abbr || "",
      role: row.role || "",
      high_king: Boolean(row.high_king),
      avatar_url: row.avatar_url || "",
      image: row.image ?? null,
      prep_score: Number(row.prep_score ?? 0),
      prep_opp_score: Number(row.prep_opp_score ?? 0),
      days: Array.isArray(row.days) ? row.days : []
    }))
    .sort((a, b) => Number(b.season) - Number(a.season));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.MIGHTPULSE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "MIGHTPULSE_API_KEY is not configured in Vercel." });
  }

  try {
    const [kingdomResponse, webKingdomResponse] = await Promise.all([
      fetch(`${API}/kingdoms/617`, {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json"
        }
      }),
      fetch(`${WEB_API}/kingdoms/617?players=100&alliances=100`, {
        headers: {
          Accept: "application/json, text/plain, */*",
          Referer: "https://mightpulse.com/kingdom/617",
          Origin: "https://mightpulse.com",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36"
        }
      })
    ]);

    const data = await readJson(kingdomResponse);
    const webData = await readJson(webKingdomResponse);

    if (!kingdomResponse.ok) {
      return res.status(kingdomResponse.status).json({
        error: "MightPulse kingdom request failed.",
        detail: typeof data === "object" ? data : String(data).slice(0, 500)
      });
    }

    const kingdom = data?.kingdom || data?.data || data;
    const matchup = webData?.kvk_matchup || webData?.data?.kvk_matchup || {};

    // The inspected MightPulse response stores historical KVK records here:
    // webData.kvk.cycles
    // Keep fallbacks for the other structures seen in the response.
    const cycles = webData?.kvk?.cycles
      || webData?.data?.kvk?.cycles
      || matchup?.cycles
      || matchup?.history
      || [];

    const kvkHistory = normalizeHistory(cycles);

    const result = {
      kingdom: 617,
      name: kingdom?.name || "617",
      player_count: Number(kingdom?.player_count ?? 0),
      power: Number(kingdom?.power ?? 0),
      // "Active Players" on the Kingdom page uses the current located count.
      active_players: Number(kingdom?.located ?? kingdom?.active_players ?? kingdom?.active_7d ?? 0),
      active_players_7d: Number(kingdom?.active_7d ?? 0),
      alliance_count: Number(kingdom?.alliance_count ?? 0),
      age_days: Number(kingdom?.age_days ?? 0),
      opened_on: kingdom?.opened_on || "2025-07-12",
      kvk: {
        season: Number(matchup?.season ?? 0),
        stage: Number(matchup?.stage ?? 0),
        stage_name: matchup?.stage_name || "",
        state_name: matchup?.state_name || "",
        opponent_kid: Number(matchup?.opponent?.kid ?? 0),
        history: kvkHistory
      },
      fetched_at: new Date().toISOString(),
      source: "MightPulse"
    };

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: "Unexpected kingdom server error.",
      detail: String(err?.message || err)
    });
  }
}
