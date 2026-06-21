import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pexels = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop`;

/** Pexels photos matched to each dish type */
const imageByItemId = {
  // Entradas quentes
  1: pexels(725997),
  591: pexels(1556699),
  3: pexels(1860193),
  4: pexels(2092897),
  5: pexels(143133),
  6: pexels(769969),
  7: pexels(1640777),
  8: pexels(2233348),
  9: pexels(1435907),
  10: pexels(357756),
  11: pexels(1049626),
  12: pexels(2233348),
  13: pexels(769289),
  14: pexels(769289),
  15: pexels(539330),
  16: pexels(1267320),
  17: pexels(1642453),
  18: pexels(539451),

  // Entradas frias
  19: pexels(357756),
  20: pexels(842571),
  21: pexels(248444),
  22: pexels(357756),
  23: pexels(842571),
  24: pexels(2098085),
  25: pexels(357756),
  26: pexels(1199957),
  27: pexels(2098085),
  28: pexels(248444),
  29: pexels(1267320),
  30: pexels(248444),
  31: pexels(248444),
};

const forceAll = process.argv.includes("--all");

async function uploadImageForItem(itemId, sourceUrl) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${sourceUrl}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error(`Downloaded file too small (${buffer.length} bytes)`);
  }

  const filePath = `item-${itemId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("menu-images")
    .upload(filePath, buffer, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from("menu-images").getPublicUrl(filePath);
  const imageUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("menu")
    .update({ image: imageUrl })
    .eq("id", itemId);

  if (updateError) throw updateError;

  return imageUrl;
}

async function main() {
  const { data: items, error } = await supabase
    .from("menu")
    .select("id,name,category,image")
    .in("category", ["entradas", "frio"])
    .order("category")
    .order("name");

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const targets = forceAll
    ? items
    : items.filter((item) => !item.image || item.image.includes("test-upload"));

  console.log(`Processing ${targets.length} of ${items.length} items...`);

  for (const item of targets) {
    const sourceUrl = imageByItemId[item.id];
    if (!sourceUrl) {
      console.warn(`⚠ No image mapped for #${item.id} ${item.name}`);
      continue;
    }

    try {
      const imageUrl = await uploadImageForItem(item.id, sourceUrl);
      console.log(`✓ #${item.id} ${item.name}`);
    } catch (err) {
      console.error(`✗ #${item.id} ${item.name}:`, err.message || err);
    }
  }

  const { data: after } = await supabase
    .from("menu")
    .select("id,name,image")
    .in("category", ["entradas", "frio"])
    .order("id");

  const missing = (after || []).filter((item) => !item.image);
  console.log(`Done. ${missing.length} still without image.`);
}

main();
