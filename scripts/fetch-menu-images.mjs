import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { queries } from "./menu-image-queries.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

// Load API key from .env.local if present, or fallback to environment variables
let apiKey = process.env.PEXELS_API_KEY || "";

if (!apiKey && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/PEXELS_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
  if (match) {
    apiKey = match[1].trim();
  }
}

if (!apiKey) {
  console.error("❌ EROARE: Nu s-a găsit cheia PEXELS_API_KEY în variabilele de mediu sau în .env.local!");
  console.log("\nPentru a obține o cheie gratuită:");
  console.log("1. Vizitează https://www.pexels.com/api/ și creează un cont gratuit.");
  console.log("2. Creează un fișier numit '.env.local' în rădăcina proiectului și adaugă linia:");
  console.log("   PEXELS_API_KEY=cheia_ta_aici\n");
  process.exit(1);
}

const OutputPath = path.join(__dirname, "menu-images-result.json");
const results = {};

// Load existing results if any to avoid re-fetching what's already done
if (fs.existsSync(OutputPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(OutputPath, "utf-8"));
    Object.assign(results, existing);
    console.log(`ℹ️ Am încărcat ${Object.keys(existing).length} rezultate existente.`);
  } catch (err) {
    // ignore
  }
}

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        console.log(`⚠️ Rate limit limitat (429). Reîncercăm peste ${delay * 2}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 2));
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`⚠️ Eroare: ${err.message}. Reîncercăm (${i + 1}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function run() {
  console.log(`🚀 Începem căutarea pozelor pe Pexels pentru ${queries.length} produse...`);

  for (let i = 0; i < queries.length; i++) {
    const item = queries[i];
    
    // Skip if already has fetched candidates
    if (results[item.name] && results[item.name].candidates && results[item.name].candidates.length > 0) {
      console.log(`[${i + 1}/${queries.length}] ⏭️ ${item.name} (deja descărcat)`);
      continue;
    }

    console.log(`[${i + 1}/${queries.length}] 🔍 Căutăm "${item.query}" pentru "${item.name}"...`);

    try {
      const searchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(item.query)}&per_page=5&orientation=landscape`;
      const data = await fetchWithRetry(searchUrl, {
        headers: {
          Authorization: apiKey,
        },
      });

      const candidates = (data.photos || []).map((photo) => ({
        url: photo.src.large, // Large is ~940px wide, perfect for menu/cards or fit=crop on fetch
        thumbnail: photo.src.medium,
        original: photo.src.original,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        pexels_url: photo.url,
      }));

      results[item.name] = {
        query: item.query,
        candidates,
        chosen: candidates[0] ? candidates[0].url : "", // Pre-select the first one by default
      };

      // Write results progressively in case of crash or rate limits
      fs.writeFileSync(OutputPath, JSON.stringify(results, null, 2), "utf-8");

      // Politeness delay to avoid hitting Pexels rate limits (max 200/hr)
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.error(`❌ Eșuat pentru "${item.name}":`, err.message);
    }
  }

  console.log(`\n✅ Finalizat! Rezultatele au fost salvate în: ${OutputPath}`);
  console.log("Pentru a aplica automat prima opțiune sugerată, poți rula:");
  console.log("  npm run images:apply");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
