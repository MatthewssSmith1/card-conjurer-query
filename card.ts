// represents cards in the state of the application
export type Card = {
  name: string;
  cost: string;
  type: string;
  // power/toughness (creature)
  // health (avatar)
  // num time counters (tale)
  // empty (otherwise)
  stats: string;
  // abilities (avatar/tale)
  // rules split by newlines (otherwise)
  abils: string[];
  // value associated with each ability
  // life change amounts (avatar)
  // num time counters (tale)
  // empty (otherwise)
  abil_nums: string[];

  //visuals
  artURL: string;
  artist: string;
  flavor: string;

  //computed
  color: string;
  convertedCost: number;
};

// cardconjurer.com's representation of a card
export type ConjuredCard = {
  artSource: string;
  infoArtist: string;
  text: {
    mana: TextField;
    title: TextField;
    type: TextField;
    rules: TextField;
    pt: TextField;
    ability0: TextField;
    ability1: TextField;
    ability2: TextField;
    ability3: TextField;
    loyalty: TextField;
  };
  planeswalker: {
    abilities: string[];
    count: number;
  };
  saga: {
    abilities: string[];
    count: number;
  };
};
export type TextField = {
  name: string;
  text: string;
};

// Convert between the two card types
export function createAbilCard(c: ConjuredCard): Card {
  const { text, artSource: artURL, infoArtist: artist } = c;
  const {
    title,
    type,
    loyalty,
    ability0: a0,
    ability1: a1,
    ability2: a2,
    ability3: a3,
  } = text;
  const abilsRaw = [a0.text, a1.text, a2.text, a3.text];
  const cost = text.mana.text;

  const isTale = type.text.includes("tale");

  const { abilities: abilNumsRaw, count } = isTale ? c.saga : c.planeswalker;
  const abils = abilsRaw.filter((_, i) => i < count);
  const abil_nums = abilNumsRaw.filter((_, i) => i < count);

  // stats
  var stats = isTale
    ? `${abil_nums.reduce((acc, n) => acc + +n, 0)}`
    : loyalty.text;

  return {
    name: title.text,
    cost,
    type: type.text,
    stats,
    abils,
    abil_nums,
    artURL,
    artist,
    flavor: "",
    color: colorOf(cost),
    convertedCost: convertCost(cost),
  };
}

export function createCard(c: ConjuredCard): Card {
  var { text, artSource: artURL, infoArtist: artist } = c;
  const cost = text.mana.text;

  const imgPrefix = "data:image";
  if (artURL.substring(0, imgPrefix.length) == imgPrefix) {
    console.log(`${text.title.text} image data loaded`);
    artURL = "";
  }

  const type = text.type.text;

  if (type.includes("tale") || type.includes("avatar"))
    return createAbilCard(c);

  var stats = type.includes("creature") ? text.pt.text : "";

  // get flavor out of rules
  var flavor = "";
  var rules = text.rules ? text.rules.text : "";
  const flavorSep = "{flavor}";
  const flavI = rules.indexOf(flavorSep);
  if (flavI != -1) {
    flavor = rules.substring(flavI + flavorSep.length);
    rules = rules.substring(0, flavI);
  }

  return {
    name: text.title.text,
    cost,
    type,
    stats,
    abils: rules.split("\n").map((r) => r.trim()),
    abil_nums: [],
    artURL: artURL,
    artist,
    flavor,
    color: colorOf(cost),
    convertedCost: convertCost(cost),
  };
}

export function info(c: Card): string {
  const { color, name, cost, type, stats, abils } = c;
  const abilsTxt = abils.map((a) => `\n    ${a[0] === "•" ? "    " : ""}${a}`);
  return [color + name, cost, type, stats, ...abilsTxt]
    .filter((txt) => txt.length != 0)
    .join("    ");
}

// Cost Utilities
export const RESET_COL = `\x1b[0m`;
export const MULTI_COL = `\x1b[36m`;

const COLORS: [string, string][] = [
  ["u", `\x1b[34m`],
  ["r", `\x1b[31m`],
  ["g", `\x1b[32m`],
  ["w", `\x1b[33m`],
  ["c", `\x1b[35m`],
];

export function colorOf(cost: string) {
  cost = cost.trim().toLowerCase();
  if (cost.length == 0) return RESET_COL;

  var color = RESET_COL;

  // determine color
  for (var i = 0; i < COLORS.length; i++) {
    const [char, col] = COLORS[i];

    // skip this color if its not in the cost
    const charIncl = cost.includes(char.toLowerCase());
    if (!charIncl) continue;

    // color has already been changed --> card is multicolored
    if (color !== RESET_COL) return MULTI_COL;

    color = col;
  }

  // the cost included 0 or 1 colors
  // return the default or the corresponding color
  return color;
}
export function convertCost(cost: string): number {
  var tokens = cost
    .replace("}", " ")
    .replace("{", " ")
    .split(" ")
    .map((s) => s.trim());
  var cmc = 0;
  tokens.forEach((t) => {
    //phyrexian counts for 0
    if (t[0] === "p") return;

    var n = parseInt(t);
    cmc += n ? n : 1;
  });
  return cmc;
}
