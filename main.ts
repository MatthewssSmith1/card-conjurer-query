import { readFileSync, writeFileSync } from "fs";
import readline from "node:readline";
import {
  Card,
  info,
  rulesOrAbilities,
  coloredName,
  title,
  name,
  type,
  cost,
  reformatCard,
  RESET_COL,
  err,
  tokenize,
  shuffle,
} from "./helpers";

// CONTENT TODO: split into two files
type State = {
  cube: Card
  // query (cards left)
  q: Card[];
  deck: Card[];
  draft?: Draft;
};

type Draft = {
  packSize: number;
  pool: Card[];
  choices: Card[];
  passed: Card[];
};

const PACK_SIZE = 5;

var state: State = {
  q: [],
  deck: [],
  draft: undefined,
};

function makeDraft(): Draft {
  var pool = shuffle(Array.from(data));
  var choices = pool.splice(0, Math.min(pool.length - 1, PACK_SIZE));
  return {
    packSize: PACK_SIZE,
    pool,
    choices,
    passed: [],
  };
}

const logQueryList = () => console.log(state.q.map(coloredName).join("\n"));

const logQueryInfo = () => console.log(state.q.map(info).join("\n"));

const logChoicesInfo = () =>
  console.log(state.draft?.choices.map(info).join("\n"));

function defaultClosingToken(): string {
  const noQuery = state.q === undefined;
  const n = noQuery ? 0 : (state.q as Card[]).length;

  if (n == 0) return "count";
  else if (n < 5) return "info";
  else if (n < 20) return "list";
  return "count";
}

export const lowercase_includes = (base: string, sub: string) =>
  base.toLowerCase().includes(sub.toLowerCase());

function handleQuery(toks: string[] = []): void {
  // defaults if missing closing command
  if (toks.length == 0) toks = [defaultClosingToken()];

  const tok = toks[0];

  if (["n", "c", "t", "r"].includes(tok)) {
    // pick the field selector func based on which shortcut is consumed
    var selField = (_: Card) => "";
    if (tok === "n") selField = name;
    else if (tok === "c") selField = cost;
    else if (tok === "t") selField = type;
    else if (tok === "r") selField = rulesOrAbilities;
    toks.shift();

    const arg = toks[0];
    if (toks.shift() !== undefined) {
      const matchesQuery = (c: Card) => lowercase_includes(selField(c), arg);
      state.q = state.q?.filter(matchesQuery);
    }

    // gracefully handle missing query argument
    handleQuery(toks);
  } else if (tok === "count") {
    console.log(state.q?.length || "0");
    return;
  } else if (tok === "list") {
    logQueryList();
    return;
  } else if (tok === "info") {
    logQueryInfo();
    return;
  }
}

const USE_START_ERR = `Use 'draft start' before other draft commands.`;

function setBaseQuery(toks: string[]): void {
  var dft = state.draft as Draft;
  var tok = toks[0];

  const update = (
    cards: Card[],
    toks: string[],
    shift: boolean = true
  ): string[] => {
    state.q = Array.from(cards);

    if (shift) toks.shift();

    return toks;
  };

  const notDrafting = state.draft === undefined;
  if (tok === "deck") toks = update(state.deck, toks);
  else if (notDrafting) toks = update(data, toks, false);
  //var dft = state.draft as Draft; ^^^ in scope
  else if (tok === "cube") toks = update(data, toks);
  else if (tok === "pool") toks = update(dft.pool, toks);
  else if (tok === "choices") toks = update(dft.choices, toks);
  else if (tok === "passed") toks = update(dft.passed, toks);
  // didn't pass any origin command while drafting
  else toks = update(state.deck, toks, false);
}

function importCmd(): void {
  // import card conjurer file
  let dataRaw = JSON.parse(readFileSync("saved-cards.cardconjurer") as any) as {
    key: string;
    data: Card;
  }[];

  state.cube = dataRaw
    .map(({ key, data }) => {
      data.text.title.text = key;
      return data;
    })
    .map(reformatCard);

  console.log(`${state.cube.length} cards loaded`);
}

function handleCommand(toks: string[]): void {
  const tok = toks[0];
  if (tok === "import") {
    return importCmd();
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
      return title(c).toLowerCase().includes(arg);
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

    state.deck.push(sel[0]);
    state.draft.passed.push(...unsel);
    state.draft.choices = dft.pool.splice(
      0,
      Math.min(dft.pool.length - 1, PACK_SIZE)
    );
    console.log("New Choices");
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
      | Card[]
      | undefined;

    if (loaded !== undefined) {
      console.log(`${loaded.length} cards loaded!`);
      state.deck = loaded;
      console.log(state.deck.map(coloredName).join("\n"));
    }
  } else {
    if (toks.length == 0) toks = ["count"];

    setBaseQuery(toks);
    handleQuery(toks);
  }
}

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

var readLineRec = async function () {
  rl.question(`${RESET_COL}> `, (line) => {
    line = line.trim();
    if (line == "quit" || line == "q") return rl.close();

    state.q = [];

    handleCommand(tokenize(line));

    readLineRec();
  });
};
readLineRec();
