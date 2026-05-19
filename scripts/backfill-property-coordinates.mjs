import { createClient } from "@supabase/supabase-js";

const cityCentroids = new Map(
  Object.entries({
    bajramcurri: [42.3573, 20.0765],
    berat: [40.7058, 19.9522],
    burrel: [41.6103, 20.0089],
    durres: [41.3231, 19.4414],
    elbasan: [41.1125, 20.0822],
    fier: [40.7239, 19.5567],
    gjirokaster: [40.0758, 20.1389],
    himare: [40.1017, 19.7453],
    kamez: [41.3817, 19.7603],
    kavaje: [41.1856, 19.5569],
    korce: [40.6186, 20.7808],
    kruje: [41.5092, 19.7928],
    kukes: [42.0767, 20.4219],
    lac: [41.6356, 19.7131],
    lezhe: [41.7836, 19.6436],
    lushnje: [40.9419, 19.705],
    pogradec: [40.9025, 20.6525],
    sarande: [39.8753, 20.0047],
    shkoder: [42.0685, 19.5126],
    tirane: [41.3275, 19.8189],
    vlore: [40.4661, 19.4914],
  }),
);

function normalizeCityKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function hasArg(name) {
  return process.argv.includes(name);
}

function getArgValue(name) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));

  return match ? match.slice(name.length + 1) : "";
}

const commit = hasArg("--commit");
const onlyMissing = hasArg("--only-missing") || !hasArg("--overwrite");
const overwrite = hasArg("--overwrite");
const propertyId = getArgValue("--property-id");
const city = getArgValue("--city");

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

let query = supabase
  .from("properties")
  .select("id,title,city,latitude,longitude,coordinate_source")
  .order("created_at", { ascending: true })
  .limit(1000);

if (propertyId) {
  query = query.eq("id", propertyId);
}

if (city) {
  query = query.eq("city", city);
}

if (onlyMissing && !overwrite) {
  query = query.is("latitude", null).is("longitude", null);
}

const { data, error } = await query;

if (error) {
  console.error(error.message);
  process.exit(1);
}

const summary = {
  ambiguous: 0,
  failed: 0,
  invalid: 0,
  processed: 0,
  skipped: 0,
  updated: 0,
  wouldUpdate: 0,
};

for (const property of data || []) {
  summary.processed += 1;

  const hasCoordinates = property.latitude != null && property.longitude != null;
  if (hasCoordinates && !overwrite) {
    summary.skipped += 1;
    console.log(`SKIP ${property.id} already has coordinates`);
    continue;
  }

  const centroid = cityCentroids.get(normalizeCityKey(property.city));
  if (!centroid) {
    summary.ambiguous += 1;
    console.log(`AMBIGUOUS ${property.id} city="${property.city || ""}"`);
    continue;
  }

  const payload = {
    coordinate_confidence: "low",
    coordinate_source: "city_centroid",
    coordinates_updated_at: new Date().toISOString(),
    latitude: centroid[0],
    location_is_approximate: true,
    longitude: centroid[1],
  };

  if (!commit) {
    summary.wouldUpdate += 1;
    console.log(
      `DRY-RUN ${property.id} "${property.title}" -> ${payload.latitude},${payload.longitude} source=city_centroid confidence=low approximate=true`,
    );
    continue;
  }

  const { error: updateError } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", property.id);

  if (updateError) {
    summary.failed += 1;
    console.log(`FAILED ${property.id} ${updateError.message}`);
    continue;
  }

  summary.updated += 1;
  console.log(`UPDATED ${property.id} source=city_centroid confidence=low approximate=true`);
}

console.log(JSON.stringify({ commit, onlyMissing, overwrite, summary }, null, 2));
