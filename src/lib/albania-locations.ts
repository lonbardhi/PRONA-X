const albaniaUrbanAreas = [
  "Bajram Curri",
  "Bajzë",
  "Ballsh",
  "Berat",
  "Bilisht",
  "Bulqizë",
  "Burrel",
  "Cërrik",
  "Çorovodë",
  "Delvinë",
  "Divjakë",
  "Durrës",
  "Elbasan",
  "Ersekë",
  "Fier",
  "Fierzë",
  "Finiq",
  "Fushë-Arrëz",
  "Fushë-Krujë",
  "Gjirokastër",
  "Gramsh",
  "Himarë",
  "Kamëz",
  "Kavajë",
  "Këlcyrë",
  "Klos",
  "Konispol",
  "Koplik",
  "Korçë",
  "Krastë",
  "Krrabë",
  "Krujë",
  "Krumë",
  "Kuçovë",
  "Kukës",
  "Kurbnesh",
  "Laç",
  "Leskovik",
  "Lezhë",
  "Libohovë",
  "Librazhd",
  "Lushnjë",
  "Maliq",
  "Mamurras",
  "Manëz",
  "Memaliaj",
  "Milot",
  "Orikum",
  "Patos",
  "Peqin",
  "Përmet",
  "Peshkopi",
  "Pogradec",
  "Poliçan",
  "Prrenjas",
  "Pukë",
  "Reps",
  "Roskovec",
  "Rrëshen",
  "Rrogozhinë",
  "Rubik",
  "Sarandë",
  "Selenicë",
  "Shëngjin",
  "Shijak",
  "Shkodër",
  "Sukth",
  "Tepelenë",
  "Tiranë",
  "Ulëz",
  "Ura Vajgurore",
  "Vau i Dejës",
  "Vlorë",
  "Vorë",
] as const;

const albaniaMunicipalities = [
  "Belsh",
  "Berat",
  "Bulqizë",
  "Cërrik",
  "Delvinë",
  "Devoll",
  "Dibër",
  "Dimal",
  "Divjakë",
  "Dropull",
  "Durrës",
  "Elbasan",
  "Fier",
  "Finiq",
  "Fushë-Arrëz",
  "Gjirokastër",
  "Gramsh",
  "Has",
  "Himarë",
  "Kamëz",
  "Kavajë",
  "Këlcyrë",
  "Klos",
  "Kolonjë",
  "Konispol",
  "Korçë",
  "Krujë",
  "Kuçovë",
  "Kukës",
  "Kurbin",
  "Lezhë",
  "Libohovë",
  "Librazhd",
  "Lushnjë",
  "Malësi e Madhe",
  "Maliq",
  "Mallakastër",
  "Mat",
  "Memaliaj",
  "Mirditë",
  "Patos",
  "Peqin",
  "Përmet",
  "Pogradec",
  "Poliçan",
  "Prrenjas",
  "Pukë",
  "Pustec",
  "Roskovec",
  "Rrogozhinë",
  "Sarandë",
  "Selenicë",
  "Shijak",
  "Shkodër",
  "Skrapar",
  "Tepelenë",
  "Tiranë",
  "Tropojë",
  "Vau i Dejës",
  "Vlorë",
  "Vorë",
] as const;

const aliasEntries = [
  ["Tiranë", ["Tirana", "Tirane"]],
  ["Durrës", ["Durres", "Durresi"]],
  ["Vlorë", ["Vlora", "Vlore"]],
  ["Sarandë", ["Sarande", "SARANDE"]],
  ["Shkodër", ["Shkoder"]],
  ["Korçë", ["Korce"]],
  ["Gjirokastër", ["Gjirokaster"]],
  ["Lezhë", ["Lezhe"]],
  ["Krujë", ["Kruje"]],
  ["Kukës", ["Kukes"]],
  ["Lushnjë", ["Lushnje"]],
  ["Përmet", ["Permet"]],
  ["Tropojë", ["Tropoje", "Tropoja"]],
  ["Malësi e Madhe", ["Malesi e Madhe", "Malesia e Madhe"]],
  ["Fushë-Arrëz", ["Fushe-Arrez", "Fushe Arrez", "Fushë Arrës", "Fushe Arres"]],
  ["Fushë-Krujë", ["Fushe-Kruje", "Fushe Kruje"]],
  ["Vau i Dejës", ["Vau I Dejes", "Vau i Dejes", "Vau Dejes"]],
  ["Ura Vajgurore", ["Dimal"]],
  ["Dimal", ["Ura Vajgurore"]],
  ["Prrenjas", ["Perrenjas", "Përrenjas"]],
  ["Laç", ["Lac"]],
  ["Çorovodë", ["Corovode", "Çorovoda", "Corovoda"]],
  ["Cërrik", ["Cerrik"]],
  ["Këlcyrë", ["Kelcyre"]],
  ["Kuçovë", ["Kucove"]],
  ["Poliçan", ["Polican"]],
  ["Rrëshen", ["Rreshen"]],
  ["Rrogozhinë", ["Rrogozhine"]],
  ["Selenicë", ["Selenice"]],
  ["Shëngjin", ["Shengjin"]],
  ["Vorë", ["Vore"]],
] as const satisfies ReadonlyArray<readonly [string, readonly string[]]>;

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeLocationKey(value: string) {
  return stripDiacritics(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function titleCaseWords(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

const canonicalLocations = Array.from(
  new Set([...albaniaUrbanAreas, ...albaniaMunicipalities]),
).sort((left, right) => left.localeCompare(right, "sq"));

const canonicalByKey = new Map<string, string>(
  canonicalLocations.map((location) => [normalizeLocationKey(location), location]),
);

const aliasesByCanonical = new Map<string, Set<string>>();

for (const [canonical, aliases] of aliasEntries) {
  canonicalByKey.set(normalizeLocationKey(canonical), canonical);

  const aliasSet = aliasesByCanonical.get(canonical) || new Set<string>();
  aliasSet.add(canonical);

  for (const alias of aliases) {
    canonicalByKey.set(normalizeLocationKey(alias), canonical);
    aliasSet.add(alias);
  }

  aliasesByCanonical.set(canonical, aliasSet);
}

export function getCanonicalAlbaniaLocation(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return canonicalByKey.get(normalizeLocationKey(trimmed)) || trimmed;
}

export function getAlbaniaLocationOptions(existingLocations: string[] = []) {
  const options = new Map<string, string>();

  for (const location of canonicalLocations) {
    options.set(location, location);
  }

  for (const location of existingLocations) {
    const canonical = getCanonicalAlbaniaLocation(location);

    if (canonical) {
      options.set(canonical, canonical);
    }
  }

  return Array.from(options.values()).sort((left, right) =>
    left.localeCompare(right, "sq"),
  );
}

export function getAlbaniaLocationFilterValues(value: string) {
  const canonical = getCanonicalAlbaniaLocation(value);

  if (!canonical) {
    return [];
  }

  const candidates = new Set<string>([
    canonical,
    value.trim(),
    stripDiacritics(canonical),
    stripDiacritics(canonical).replaceAll("-", " "),
    canonical.replaceAll("-", " "),
  ]);

  for (const alias of aliasesByCanonical.get(canonical) || []) {
    candidates.add(alias);
    candidates.add(stripDiacritics(alias));
    candidates.add(stripDiacritics(alias).replaceAll("-", " "));
  }

  for (const candidate of Array.from(candidates)) {
    if (!candidate) {
      continue;
    }

    candidates.add(candidate.toUpperCase());
    candidates.add(candidate.toLowerCase());
    candidates.add(titleCaseWords(candidate));
  }

  return Array.from(candidates).filter(Boolean);
}
