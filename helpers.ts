export type Text = {
  name: string;
  text: string;
};

export type Card = {
  key: string; //card name
  data: {
    width: number; //1500 default
    height: number; //2100 default
    marginX: number;
    marginY: number;
    // frames: [
    //   {
    //     name: "Multicolored Frame";
    //     src: "/img/frames/promo/regular/m15PromoFrameM.png";
    //     masks: [
    //       { src: "/img/frames/promo/m15PromoMaskPinline.png"; name: "Pinline" }
    //     ];
    //   },
    //   {
    //     name: "Blue Frame";
    //     src: "/img/frames/promo/regular/m15PromoFrameU.png";
    //     masks: [
    //       { src: "/img/frames/promo/m15PromoMaskRules.png"; name: "Rules" }
    //     ];
    //   },
    //   {
    //     name: "Blue Frame";
    //     src: "/img/frames/promo/regular/m15PromoFrameU.png";
    //     masks: [
    //       { src: "/img/frames/promo/m15PromoMaskRules.png"; name: "Rules" }
    //     ];
    //   },
    //   {
    //     name: "Blue Frame";
    //     src: "/img/frames/promo/regular/m15PromoFrameU.png";
    //     masks: [
    //       { src: "/img/frames/promo/m15PromoMaskType.png"; name: "Type" }
    //     ];
    //   },
    //   {
    //     name: "Blue Frame";
    //     src: "/img/frames/promo/regular/m15PromoFrameU.png";
    //     masks: [
    //       { src: "/img/frames/promo/m15PromoMaskType.png"; name: "Type" }
    //     ];
    //   },
    //   {
    //     name: "Blue Frame";
    //     src: "/img/frames/promo/regular/m15PromoFrameU.png";
    //     masks: [
    //       { src: "/img/frames/m15/regular/m15MaskTitle.png"; name: "Title" }
    //     ];
    //   },
    //   {
    //     name: "Blue Frame";
    //     src: "/img/frames/promo/regular/m15PromoFrameU.png";
    //     masks: [
    //       { src: "/img/frames/m15/regular/m15MaskTitle.png"; name: "Title" }
    //     ];
    //   }
    // ];
    artSource: string;
    artX: number;
    artY: number;
    artZoom: number;
    artRotate: number;
    version: "promoRegular"; //format?
    margins: boolean;
    infoArtist: string; //artist
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
      count: number; //number of abilities
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

export function tokenize(s: string): string[] {
  s = s.trim();
  if (s.length == 0) return ["end"];

  //check for leading literal
  var matchLit = /^"(.*)"(.*)/g.exec(s);
  if (matchLit) return [matchLit[1], ...tokenize(matchLit[2])];

  //parse next word
  var spaceI = s.indexOf(" ");
  var word = s;
  var after: string[] = ["end"];
  if (spaceI != -1) {
    word = s.substring(0, spaceI);
    after = tokenize(s.substring(spaceI));
  }

  return [word, ...after];
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
