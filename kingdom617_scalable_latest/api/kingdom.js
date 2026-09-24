// Vercel Serverless Function
// Kingdom 617 data + KVK history from MightPulse.

const API = "https://api.mightpulse.com/v1";
const WEB_API = "https://mightpulse.com/api";

async function readJson(response) {
  const raw = await response.text();
  try { return JSON.parse(raw); }
  catch { return { raw }; }
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(r => r && (r.opponent_kid != null || r.season != null || r.result))
    .map(r => ({
      opponent_kid: Number(r.opponent_kid ?? 0),
      prep: r.prep || "",
      castle: r.castle || "",
      result: r.result || "",
      label: r.label || "",
      season: Number(r.season ?? 0),
      appointed_at: Number(r.appointed_at ?? r.first_at ?? r.begin_ts ?? 0),
      nick_name: r.nick_name || "—",
      alliance_abbr: r.alliance_abbr || "",
      role: r.role || (r.high_king ? "High King" : "King"),
      high_king: Boolean(r.high_king),
      avatar_url: r.avatar_url || "",
      image: r.image ?? null,
      prep_score: Number(r.prep_score ?? 0),
      prep_opp_score: Number(r.prep_opp_score ?? 0),
      days: Array.isArray(r.days) ? r.days : []
    }))
    .sort((a,b) => (b.season - a.season) || (b.appointed_at - a.appointed_at));
}

// The MightPulse response has appeared in more than one shape.
// Search the complete JSON recursively so a layout change does not make history disappear.
function findArraysByKey(value, key, out = []) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const item of value) findArraysByKey(item, key, out);
    return out;
  }
  for (const [k,v] of Object.entries(value)) {
    if (k === key && Array.isArray(v)) out.push(v);
    findArraysByKey(v, key, out);
  }
  return out;
}

function extractKvkHistory(webData) {
  const candidates = [
    ...findArraysByKey(webData, "history"),
    ...findArraysByKey(webData, "cycles")
  ];

  // Prefer rows that actually contain season/opponent/result information.
  const ranked = candidates
    .map(rows => normalizeRows(rows))
    .filter(rows => rows.length)
    .sort((a,b) => b.length - a.length);

  return ranked[0] || [];
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({error:"Method not allowed"});

  const key = process.env.MIGHTPULSE_API_KEY;
  if (!key) return res.status(500).json({error:"MIGHTPULSE_API_KEY is not configured in Vercel."});

  try {
    const [kingdomResponse, webKingdomResponse] = await Promise.all([
      fetch(`${API}/kingdoms/617`, {
        headers: { Authorization:`Bearer ${key}`, Accept:"application/json" }
      }),
      fetch(`${WEB_API}/kingdoms/617?players=100&alliances=100`, {
        headers: {
          Accept:"application/json, text/plain, */*",
          Referer:"https://mightpulse.com/kingdom/617",
          Origin:"https://mightpulse.com",
          "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36"
        }
      })
    ]);

    const data = await readJson(kingdomResponse);
    const webData = await readJson(webKingdomResponse);

    if (!kingdomResponse.ok) {
      return res.status(kingdomResponse.status).json({
        error:"MightPulse kingdom request failed.",
        detail:typeof data === "object" ? data : String(data).slice(0,500)
      });
    }

    const kingdom = data?.kingdom || data?.data || data;
    const matchup = webData?.kvk_matchup || webData?.data?.kvk_matchup || {};
    const history = extractKvkHistory(webData);

    const result = {
      kingdom:617,
      name:kingdom?.name || "617",
      player_count:Number(kingdom?.player_count ?? 0),
      power:Number(kingdom?.power ?? 0),
      active_players:Number(kingdom?.located ?? kingdom?.active_players ?? kingdom?.active_7d ?? 0),
      active_players_7d:Number(kingdom?.active_7d ?? 0),
      alliance_count:Number(kingdom?.alliance_count ?? 0),
      age_days:Number(kingdom?.age_days ?? 0),
      opened_on:kingdom?.opened_on || "2025-07-12",
      kvk:{
        season:Number(matchup?.season ?? 0),
        stage:Number(matchup?.stage ?? 0),
        stage_name:matchup?.stage_name || "",
        state_name:matchup?.state_name || "",
        opponent_kid:Number(matchup?.opponent?.kid ?? 0),
        history
      },
      fetched_at:new Date().toISOString(),
      source:"MightPulse"
    };

    res.setHeader("Cache-Control","s-maxage=1800, stale-while-revalidate=3600");
    res.setHeader("Content-Type","application/json; charset=utf-8");
    return res.status(200).json(result);
  } catch(err) {
    return res.status(500).json({error:"Unexpected kingdom server error.",detail:String(err?.message || err)});
  }
}
