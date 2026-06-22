import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (key) => {
  const match = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].replace(/^"|"$/g, "") : "";
};

const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
);

const pexels = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop`;

const normalize = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const categoryFallback = {
  entradas: pexels(699953),
  frio: pexels(248444),
  sashimi: pexels(2635038),
  jyo: pexels(357756),
  niguiri: pexels(357756),
  hot: pexels(2098085),
  temaki: pexels(724991),
  yakissoba: pexels(769289),
  executivo: pexels(357756),
  poke: pexels(1640777),
  combinado: pexels(357756),
  sobremesa: pexels(291528),
  bebida: pexels(2619970),
  drink: pexels(1300505),
  destilado: pexels(602750),
};

const keywordRules = [
  { keys: ["agua com gas", "água com gás"], url: pexels(928112) },
  { keys: ["agua sem gas", "água sem gás"], url: pexels(1283219) },
  { keys: ["soda italiana"], url: pexels(2619970) },
  { keys: ["refrigerante em lata", "refrigerante"], url: pexels(2619970) },
  { keys: ["suco da fruta", "suco"], url: pexels(1556697) },
  { keys: ["combinado missô", "combinado", "park jade", "park living", "park prime", "park vista", "park villagio", "park elegance", "park studio", "park venice"], url: pexels(357756) },
  { keys: ["bolinho de salmao", "bolinho salmao"], url: pexels(2098085) },
  { keys: ["bolinho de camarao", "bolinho camarao"], url: pexels(2098085) },
  { keys: ["bolinho de atum", "bolinho atum"], url: pexels(2098085) },
  { keys: ["bolinho"], url: pexels(2098085) },
  { keys: ["edamame"], url: pexels(5928413) },
  { keys: ["guioza", "gyoza"], url: pexels(699953) },
  { keys: ["harumakis doces"], url: pexels(291528) },
  { keys: ["harumaki"], url: pexels(106343) },
  { keys: ["pate de skin", "patê de skin"], url: pexels(2098085) },
  { keys: ["isca de tilapia", "isca"], url: pexels(2098088) },
  { keys: ["shimeji", "shitake", "shiitake"], url: pexels(769289) },
  { keys: ["missoshiro", "entradinha misso", "missô", "misso"], url: pexels(376464) },
  { keys: ["sunomono"], url: pexels(1556697) },
  { keys: ["ceviche"], url: pexels(1128678) },
  { keys: ["carpaccio"], url: pexels(2635038) },
  { keys: ["tataki"], url: pexels(2635038) },
  { keys: ["sashimi de salmao", "sashimi salmao"], url: pexels(248444) },
  { keys: ["sashimi de atum", "sashimi atum"], url: pexels(2635038) },
  { keys: ["sashimi"], url: pexels(2635038) },
  { keys: ["niguiri de salmao", "niguiri salmao"], url: pexels(248444) },
  { keys: ["niguiri de atum", "niguiri atum"], url: pexels(2635038) },
  { keys: ["niguiri"], url: pexels(357756) },
  { keys: ["uramaki", "jyo", "hossomaki"], url: pexels(357756) },
  { keys: ["philadelphia", "hot roll", "hot philadelphia"], url: pexels(2098085) },
  { keys: ["hot nana", "hot"], url: pexels(2098085) },
  { keys: ["temaki de salmao", "temaki salmao"], url: pexels(248444) },
  { keys: ["temaki"], url: pexels(724991) },
  { keys: ["yakissoba", "yaki soba"], url: pexels(769289) },
  { keys: ["poke"], url: pexels(1640777) },
  { keys: ["executivo"], url: pexels(357756) },
  { keys: ["salmao", "salmão"], url: pexels(248444) },
  { keys: ["atum"], url: pexels(2635038) },
  { keys: ["camarao", "camarão"], url: pexels(2098085) },
  { keys: ["polvo"], url: pexels(248444) },
  { keys: ["peixe branco"], url: pexels(248444) },
  { keys: ["tempura"], url: pexels(2098088) },
  { keys: ["sorvete", "mochi", "brownie", "petit gateau", "goiabada"], url: pexels(291528) },
  { keys: ["cerveja", "heineken", "stella"], url: pexels(1267322) },
  { keys: ["caipirinha", "caipifruta"], url: pexels(1300505) },
  { keys: ["mojito"], url: pexels(1126728) },
  { keys: ["gin"], url: pexels(616836) },
  { keys: ["sake", "sakê"], url: pexels(602750) },
  { keys: ["vodka"], url: pexels(602750) },
  { keys: ["whisky", "whiskey"], url: pexels(602750) },
  { keys: ["drink"], url: pexels(1300505) },
];

const uploadCache = new Map();

const forceAll = process.argv.includes("--force");

function isManualUpload(imageUrl) {
  if (forceAll) return false;
  const file = imageUrl?.split("/").pop() || "";
  // Only skip images uploaded manually after a curated fix (auto- prefix)
  return /^auto-\d+-\d+\.(jpe?g|png|webp)$/i.test(file);
}

function pickImageUrl(item) {
  const name = normalize(item.name || "");
  for (const rule of keywordRules) {
    if (rule.keys.some((key) => name.includes(normalize(key)))) {
      return rule.url;
    }
  }
  return categoryFallback[item.category] || pexels(357756);
}

async function uploadFromUrl(sourceUrl, item) {
  if (uploadCache.has(sourceUrl)) return uploadCache.get(sourceUrl);

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Download failed ${response.status} for ${item.name}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = `auto-${item.id}-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from("menu-images")
    .upload(filePath, buffer, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("menu-images").getPublicUrl(filePath);
  uploadCache.set(sourceUrl, data.publicUrl);
  return data.publicUrl;
}

const { data: menuItems, error } = await supabase
  .from("menu")
  .select("id,name,category,image")
  .order("id");

if (error) {
  console.error(error);
  process.exit(1);
}

let updated = 0;
let skipped = 0;
let failed = 0;

for (const item of menuItems) {
  if (isManualUpload(item.image)) {
    skipped += 1;
    continue;
  }

  try {
    const sourceUrl = pickImageUrl(item);
    const publicUrl = await uploadFromUrl(sourceUrl, item);
    const { error: updateError } = await supabase
      .from("menu")
      .update({ image: publicUrl })
      .eq("id", item.id);

    if (updateError) throw updateError;
    updated += 1;
    console.log(`OK  #${item.id} ${item.name}`);
  } catch (itemError) {
    failed += 1;
    console.error(`ERR #${item.id} ${item.name}:`, itemError.message);
  }
}

console.log(`\nDone. Updated: ${updated}, skipped manual: ${skipped}, failed: ${failed}`);
