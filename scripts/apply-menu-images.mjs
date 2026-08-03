import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultPath = path.join(__dirname, "menu-images-result.json");
const menuFilePath = path.join(__dirname, "..", "src", "pages", "Menu.tsx");

if (!fs.existsSync(resultPath)) {
  console.error("❌ EROARE: Nu s-a găsit fișierul de rezultate 'menu-images-result.json'!");
  console.log("Te rog să rulezi mai întâi: npm run images:fetch\n");
  process.exit(1);
}

if (!fs.existsSync(menuFilePath)) {
  console.error(`❌ EROARE: Nu s-a găsit fișierul Menu.tsx la calea: ${menuFilePath}`);
  process.exit(1);
}

let results;
try {
  results = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
} catch (err) {
  console.error("❌ EROARE: Nu s-a putut parsa fișierul 'menu-images-result.json'!", err.message);
  process.exit(1);
}

console.log("📂 Se citește src/pages/Menu.tsx...");
const lines = fs.readFileSync(menuFilePath, "utf-8").split(/\r?\n/);
const outputLines = [];

let currentName = null;
let updatedCount = 0;

const nameRegex = /name:\s*["']([^"']+)["']/;
const imageRegex = /(image:\s*["'])([^"']*)(["'])/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Try to match name
  const nameMatch = line.match(nameRegex);
  if (nameMatch) {
    currentName = nameMatch[1].trim();
  }

  // Try to match image line
  const imageMatch = line.match(imageRegex);
  if (imageMatch && currentName) {
    const itemData = results[currentName];
    if (itemData && itemData.chosen) {
      const newLine = line.replace(imageRegex, `$1${itemData.chosen}$3`);
      if (newLine !== line) {
        outputLines.push(newLine);
        updatedCount++;
        // console.log(`✨ Înlocuit pentru "${currentName}": ${itemData.chosen}`);
      } else {
        outputLines.push(line);
      }
    } else {
      outputLines.push(line);
    }
    // Reset name after we processed the image line for this item
    currentName = null;
  } else {
    outputLines.push(line);
  }
}

fs.writeFileSync(menuFilePath, outputLines.join("\n"), "utf-8");
console.log(`\n🎉 Succes! Am actualizat ${updatedCount} imagini în src/pages/Menu.tsx.`);
