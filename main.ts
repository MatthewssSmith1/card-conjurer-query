import { readFileSync, writeFileSync } from "fs";
import readline from "node:readline";
import { Card, ConjuredCard, createCard, info, RESET_COL } from "./card";
import { tokenize, shuffle } from "./helpers";

const PACK_SIZE = 5;

// CONTENT TODO: split into two files
type State = {
  cube: Card[];
  // query (cards left)
  deck: Deck;
  draft?: Draft;
};

type Deck = {
  main: Card[];
  side: Card[];
};

type Draft = {
  pool: Card[];
  choices: Card[];
  passed: Card[];
};

var state: State = {
  cube: [],
  deck: {
    main: [],
    side: [],
  },
  draft: undefined,
};

export const err = (msg: string) => console.log(`\x1b[31m${msg}\x1b[0m`);

function makeDraft(): Draft {
  var pool = shuffle(Array.from(state.cube));
  var choices = pool.splice(0, Math.min(pool.length - 1, PACK_SIZE));
  return {
    pool,
    choices,
    passed: [],
  };
}

const logChoicesInfo = () =>
  console.log(state.draft?.choices.map(info).join("\n"));

export const lowercase_includes = (base: string, sub: string) =>
  base.toLowerCase().includes(sub.toLowerCase());

const USE_START_ERR = `Use 'draft start' before other draft commands.`;

function query(toks: string[]): void {
  const notDrafting = state.draft === undefined;
  var dft = state.draft as Draft;

  var tok = toks[0];

  var cards: Card[] = [];
  var shift = true;
  if (tok === "deck") cards = state.deck.main;
  else if (tok === "side") cards = state.deck.side;
  else if (tok === "cube") cards = state.cube;
  else if (notDrafting) {
    cards = state.cube;
    shift = false;
  } else if (tok === "pool") cards = dft.pool;
  else if (tok === "choices") cards = dft.choices;
  else if (tok === "passed") cards = dft.passed;
  // didn't pass any origin command while drafting
  else {
    var deckSize = state.deck.main.length;
    cards = deckSize > 0 ? state.deck.main : state.cube;
    shift = false;
  }

  if (shift) toks.shift();

  const narrowQuery = (select: (c: Card) => string) => {
    // remove shortcut in if statement where this was called
    toks.shift();

    var arg = toks[0];
    if (toks.shift() !== undefined) {
      arg = arg.toLowerCase();
      cards = cards.filter((c) => select(c).toLowerCase().includes(arg));
    }
  };

  while (true) {
    const numCards = cards.length;

    if (toks.length == 0) {
      var newTok = "count";
      if (numCards == 0) newTok = "count";
      else if (numCards <= 5) newTok = "info";
      else if (numCards <= 20) newTok = "list";

      toks = [newTok];
    }

    const tok = toks[0];

    if (tok === "count") {
      return console.log(numCards);
    } else if (tok === "list") {
      return console.log(cards.map((c) => c.color + c.name).join("\n"));
    } else if (tok === "info") {
      return console.log(cards.map(info).join("\n"));
    } else if (tok === "n") narrowQuery((c) => c.name);
    else if (tok === "c") narrowQuery((c) => c.cost);
    else if (tok === "t") narrowQuery((c) => c.type);
    else if (tok === "r") narrowQuery((c) => c.abils.join("\n"));
    else return err(`Unexpected symbol '${tok}'.`);
  }
}

function handleCommand(toks: string[]): void {
  const tok = toks[0];
  if (tok === "import") {
    return conjurerImport();
  } else if (tok === "start") {
    if (state.draft === undefined) {
      state.draft = makeDraft();
      logChoicesInfo();
    } else err(`Draft in progress. Use 'draft stop' first.`);
    return;
  } else if (tok === "stop") {
    if (state.draft === undefined) return err(USE_START_ERR);

    state.draft = undefined;
    console.log("Draft stopped.");
    return;
  } else if (tok === "p") {
    if (state.draft === undefined) return err(USE_START_ERR);
    const dft = state.draft as Draft;

    if (toks.length != 2) return err("(p)ick must be used with 1 arg.");
    var arg = toks[1].toLowerCase();

    const isSel = (c: Card): boolean => {
      return c.name.toLowerCase().includes(arg);
    };
    //TODO: change isSel to index if the input can be parsed as a number

    // selected cards from arg
    var sel: Card[] = [];
    // choices left over (not selected)
    var unsel: Card[] = [];

    dft.choices.forEach((c) => {
      if (isSel(c)) sel.push(c);
      else unsel.push(c);
    });

    if (sel.length != 1) return err(`You tried to pick ${sel.length} cards.`);

    state.deck.main.push(sel[0]);
    state.draft.passed.push(...unsel);
    state.draft.choices = dft.pool.splice(
      0,
      Math.min(dft.pool.length - 1, PACK_SIZE)
    );
    console.log("New Choices:");
    logChoicesInfo();
    return;
  } else if (tok === "save") {
    if (toks.length != 2) return err("save must be used with 1 arg.");
    var arg = toks[1].toLowerCase();

    writeFileSync(`./decks/${arg}.json`, JSON.stringify(state.deck));
  } else if (tok === "load") {
    if (toks.length != 2) return err("load must be used with 1 arg.");
    var arg = toks[1].toLowerCase();

    let loaded = JSON.parse(readFileSync(`./decks/${arg}.json`) as any) as
      | Deck
      | undefined;

    if (loaded !== undefined) {
      state.deck = loaded;
      console.log(`Deck loaded`);
    } else err("Couldn't load deck");
  } else query(toks);
}

function conjurerImport(): void {
  // import card conjurer file
  let dataRaw = JSON.parse(readFileSync("saved-cards.cardconjurer") as any) as {
    key: string;
    data: ConjuredCard;
  }[];

  // TODO: is the first map needed?
  state.cube = dataRaw
    .map(({ key, data }) => {
      data.text.title.text = key;
      return data;
    })
    .map(createCard);

  console.log(`${state.cube.length} cards loaded`);
}
conjurerImport();

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

var readLineRec = async function () {
  rl.question(`${RESET_COL}> `, (line) => {
    var toks = tokenize(line.trim());

    if (toks.length > 0) {
      if (toks[0] == "q") return rl.close();

      handleCommand(toks);
    } else {
      err("Command expected.");
    }

    readLineRec();
  });
};
readLineRec();
