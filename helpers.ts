export type Text = {
  name: string;
  text: string;
};

export type Card = {
  data: {
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
  };
};

export type ParseRule = [RegExp, (match: string, ctx: Card[]) => Card[]];
export type OutputRule = [RegExp, (ctx: Card[]) => string];

export function abilities(c: Card) {
  return c.data.planeswalker.abilities
    .map((cost, i) => {
      var a = (c.data.text as any)[`ability${i}`];

      if (a === undefined) return undefined;

      var text = a.text;

      if (text.charAt(0) !== "-") text = "+" + text;

      return `${cost}   ${a.text}`;
    })
    .filter((s) => s !== undefined)
    .join("\n");
}

export function fmtRules(s: string) {
  const flavI = s.indexOf("{flavor}");
  if (flavI == -1) return s;
  return s.substring(0, flavI);
}

export function info(c: Card) {
  var { text, planeswalker } = c.data;
  var { mana, title, type, rules, pt } = text;

  var info = [`${color(c)}${title.text}`];

  if (mana) info.push(mana.text);
  if (type) info.push(type.text);
  if (pt) info.push(pt.text);
  if (rules) info.push("\n" + fmtRules(rules.text));
  if (planeswalker !== undefined) info.push(abilities(c));

  return info.join("    ");
}

export const RESET_COL = `\x1b[0m`;

const COLORS: [string, string][] = [["u", `\x1b[34m`]];

export function color(c: Card) {
  if (!mana(c)) return;

  var numCols = 0;
  var color = RESET_COL;
  if (contains(mana, "u")(c)) {
    numCols++;
    color = `\x1b[34m`;
  }
  if (contains(mana, "r")(c)) {
    numCols++;
    color = `\x1b[31m`;
  }
  if (contains(mana, "g")(c)) {
    numCols++;
    color = `\x1b[32m`;
  }
  if (contains(mana, "w")(c)) {
    numCols++;
    color = `\x1b[37m`;
  }
  if (contains(mana, "c")(c)) {
    numCols++;
    color = `\x1b[35m`;
  }
  if (numCols > 1) color = `\x1b[33m`;

  return color;
}

function contains(map: (c: Card) => Text, match: string) {
  const mLowerCase = match.toLowerCase();
  return (c: Card) => map(c).text.toLowerCase().includes(mLowerCase);
}

export const type = (c: Card) => c.data.text.type;
export const rules = (c: Card) => c.data.text.rules;
export const title = (c: Card) => c.data.text.title;
export const mana = (c: Card) => c.data.text.mana;
export const pt = (c: Card) => c.data.text.pt;

export function cmc(c: Card): number {
  var tokens = mana(c)
    .text.replace("}", " ")
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

export const err = (msg: string) => console.log(`\x1b[31m${msg}${RESET_COL}`);

function desugar(tok: string): string {
  switch (tok) {
    case "title":
      return "t";
    case "mana":
      return "m";
    case "type":
      return "y";
    case "rules":
      return "r";
    default:
      return tok;
  }
}

export function tokenize(s: string): string[] {
  s = s.trim();
  if (s.length == 0) return ["end"];

  //check for leading literal
  var matchLit = /^"(.*)"(.*)/g.exec(s);
  if (matchLit) return [matchLit[1], ...tokenize(matchLit[2])];

  //parse next word
  var spcIdx = s.indexOf(" ");
  var nextTok = s;
  var rest = ["end"];
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
