export type NewAbility = {
  text: string;
  num: number;
};

export type NewCard = {
  name: string;
  cost: string;
  type: string;
  // power/toughness, health on a planeswalker, number of turns on tale, empty otherwise
  stats: string;
  // abilities: tale/avatar abilities or rules split by newlines
  abils: NewAbility[];
  artURL: string;
  artist: string;
};

export type Text = {
  name: string;
  text: string;
};

export type Card = {
  artSource: string;
  infoArtist: string;
  text: {
    mana: Text;
    title: Text;
    type: Text;
    rules: Text;
    pt: Text;
    ability0: Text;
    ability1: Text;
    ability2: Text;
    ability3: Text;
    loyalty: Text;
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

export function info(c: Card): string {
  var info = [coloredName(c), cost(c), type(c), stats(c)];

  info.push(
    rulesOrAbilities(c)
      .split("\n")
      .map((txt) => "\n    " + txt)
      .join("")
  );

  return info.filter((txt) => txt.length != 0).join("    ");
}

export function rulesOrAbilities(c: Card): string {
  if (c.text.rules !== undefined) return flavorlessRules(c);
  else if (c.planeswalker !== undefined) {
    return c.planeswalker.abilities
      .map((cost, i) => {
        var a = (c.text as any)[`ability${i}`];

        if (a === undefined) return undefined;

        var text = a.text;

        if (text.charAt(0) !== "-") text = "+" + text;

        return `${cost}   ${a.text}`;
      })
      .filter((s) => s !== undefined)
      .join("\n");
  } else if (c.saga !== undefined) {
    return c.saga.abilities
      .map((count, i) => {
        var a = (c.text as any)[`ability${i}`];

        if (a === undefined) return undefined;

        var text = a.text;

        if (text.charAt(0) !== "-") text = "+" + text;

        if (a.text.trim().length === 0) return undefined;

        return `(${count}) ${a.text}`.split("\n").join("\n\t");
      })
      .filter((s) => s !== undefined)
      .join("\n");
  } else {
    console.log(c);
  }

  return "";
}

export const RESET_COL = `\x1b[0m`;
export const MULTI_COL = `\x1b[36m`;

type ColorSetting = [string, string];
const COLORS: ColorSetting[] = [
  ["u", `\x1b[34m`],
  ["r", `\x1b[31m`],
  ["g", `\x1b[32m`],
  ["w", `\x1b[33m`],
  ["c", `\x1b[35m`],
];

// Field & Computed Accessors
export const type = (c: Card): string => c.text.type.text;
export const rules = (c: Card): string => c.text.rules.text;
export const title = (c: Card): string => c.text.title.text;
export const name = (c: Card): string => c.text.title.text;
export const mana = (c: Card): string => c.text.mana.text;
export const cost = (c: Card): string => c.text.mana.text;
export const pt = (c: Card): string => c.text.pt.text;
export const stats = (c: Card): string => c.text.pt.text;
export const coloredName = (c: Card): string => `${color(c)}${title(c)}`;
export function color(c: Card) {
  if (!mana(c)) return RESET_COL;

  var color = RESET_COL;

  // determine color
  for (var i = 0; i < COLORS.length; i++) {
    const [char, col] = COLORS[i];

    // skip this color if its not in the cost
    const charIncl = mana(c).toLowerCase().includes(char.toLowerCase());
    if (!charIncl) continue;

    // color has already been changed --> card is multicolored
    if (color !== RESET_COL) return MULTI_COL;

    color = col;
  }

  // the cost included 0 or 1 colors
  // return the default or the corresponding color
  return color;
}
export function cmc(c: Card): number {
  var tokens = mana(c)
    .replace("}", " ")
    .replace("{", " ")
    .split(" ")
    .map((s) => s.trim());
  var cmc = 0;
  tokens.forEach((t) => {
    var num = parseInt(t);
    cmc += num ? num : 1;
  });
  return cmc;
}
export function flavorlessRules(c: Card) {
  var rules = c.text.rules.text;
  const flavI = rules.indexOf("{flavor}");
  if (flavI == -1) return rules;
  return rules.substring(0, flavI);
}

/// converts a token to its short variant if possible (ie 'name' -> 'n')
/// the token should be expected to be a command and not a literal to
/// avoid unintended behavior (modifying query arguments)
function desugar(tok: string): string {
  switch (tok) {
    case "name":
      return "n";
    case "cost":
      return "c";
    case "type":
      return "t";
    case "rules":
      return "r";
    case "pick":
      return "p";
    default:
      return tok;
  }
}

export const err = (msg: string) => console.log(`\x1b[31m${msg}${RESET_COL}`);

/// converts a command into a sequence of tokens (strings)
/// separated by spaces except those in "double quotes"
export function tokenize(s: string): string[] {
  s = s.trim();
  if (s.length == 0) return [];

  //check for leading literal
  var matchLit = /^"(.*)"(.*)/g.exec(s);
  if (matchLit) return [matchLit[1], ...tokenize(matchLit[2])];

  //parse next word
  var spcIdx = s.indexOf(" ");
  var nextTok = s;
  var rest: string[] = [];
  if (spcIdx != -1) {
    nextTok = s.substring(0, spcIdx);
    rest = tokenize(s.substring(spcIdx));
  }

  return [desugar(nextTok), ...rest];
}

export function shuffle(array: any[]) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
