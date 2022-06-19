import { readFileSync, writeFileSync } from "fs";
import readline from "node:readline";
import {
  Card,
  Text,
  info,
  color,
  type,
  rules,
  title,
  mana,
  pt,
  RESET_COL,
  err,
  tokenize,
  cmc,
  shuffle,
} from "./helpers";

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let data = JSON.parse(
  readFileSync("saved-cards.cardconjurer") as any
) as Card[];

writeFileSync(
  "condensed.json",
  JSON.stringify(
    data.map((c) => ({
      text: c.data.text,
    }))
  )
);
data
  .filter((c) => c.data.artSource.substring(0, 10) === "data:image")
  .forEach((c) => console.log(c.data.text.title + " image data loaded"));
console.log(`${data.length} cards loaded`);

function parse(ctx: Card[], tokens: string[]) {
  var narrowQuery = (getText: (c: Card) => Text) => {
    var token = tokens.shift();
    if (token === undefined) {
      err("missing argument");
      return [];
    }
    ctx = ctx.filter(getText).filter((t) =>
      getText(t)
        .text.toLowerCase()
        .includes(token as string)
    );
  };
  const consume = (func: (tok: string) => Card[]) => {
    var token = tokens.shift();
    if (token === undefined) return;
    ctx = func(token);
  };
  switch (tokens.shift()) {
    case "s":
    case "sort":
      consume((tok) => {
        if (tok === "mana")
          return ctx.sort((a: Card, b: Card) => cmc(a) - cmc(b));
        return ctx;
      });
      break;
    case "p":
    case "pack":
      consume((tok) => {
        var count = parseInt(tok);
        if (count === undefined || count < 0 || count > 15) count = 5;
        if (count > ctx.length) count = ctx.length;
        shuffle(ctx);
        // console.log(ctx)
        return ctx.splice(0, count);
      });
      break;
    case "m<":
      consume((tok) => ctx.filter((c) => cmc(c) < parseInt(tok)));
      break;
    case "m>":
      consume((tok) => ctx.filter((c) => cmc(c) > parseInt(tok)));
      break;
    case "m=":
      consume((tok) => ctx.filter((c) => cmc(c) == parseInt(tok)));
      break;
    case "y":
    case "type":
      narrowQuery(type);
      break;
    case "r":
    case "rules":
      narrowQuery(rules);
      break;
    case "t":
    case "title":
      narrowQuery(title);
      break;
    case "m":
    case "mana":
      narrowQuery(mana);
      break;
    case "pt":
      narrowQuery(pt);
      break;
    case "i":
    case "info":
      console.log(ctx.map(info).join("\n\n"));
      return;
    case "l":
    case "list":
      console.log(ctx.map((c) => `${color(c)}${title(c).text}`).join("\n"));
      return;
    case "c":
    case "end":
      if (ctx.length == data.length) return;
      if (ctx.length <= 20) {
        console.log(ctx.map((c) => `${color(c)}${title(c).text}`).join("\n"));
        return;
      }
      if (ctx.length <= 5) {
        console.log(ctx.map(info).join("\n\n"));
        return;
      }
    case "count":
      console.log(`\x1b[4m\x1b[32m${ctx.length}`);
      return;
    default:
      err("unexpected symbol");
      return;
  }

  if (tokens.length > 0) parse(ctx, tokens);
}

var readLineRec = function () {
  rl.question(`${RESET_COL}> `, (line) => {
    if (line == "exit" || line == "quit" || line == "q") return rl.close();

    parse(data, tokenize(line));

    readLineRec();
  });
};
readLineRec();
