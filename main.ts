import { readFileSync, writeFileSync } from "fs";
import readline from "node:readline";
import {
  Card,
  info,
  rulesOrAbilities,
  colorTitle,
  type,
  title,
  mana,
  RESET_COL,
  err,
  tokenize,
  shuffle,
} from "./helpers";

// import card conjurer file
let dataRaw = JSON.parse(readFileSync("saved-cards.cardconjurer") as any) as {
  key: string;
  data: Card;
}[];

const data = dataRaw.map(({ key, data }) => {
  data.text.title.text = key;
  return data;
});

// print cards that have image data stored in card conjurer file
data
  .filter((c) => c.artSource.substring(0, 10) === "data:image")
  .forEach((c) => console.log(c.text.title + " image data loaded"));

console.log(`${data.length} cards loaded`);

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

type Draft = {
  packSize: number;
  pool: Card[];
  choices: Card[];
  picked: Card[];
  passed: Card[];
};
const PACK_SIZE = 5;
function makeDraft(): Draft {
  var pool = shuffle(Array.from(data));
  var choices = pool.splice(0, Math.min(pool.length - 1, PACK_SIZE));
  return {
    packSize: PACK_SIZE,
    pool,
    choices,
    picked: [],
    passed: [],
  };
}

type State = {
  q?: Card[];
  draft?: Draft;
};

var state: State = {
  q: undefined,
  draft: undefined,
};

type Filter = (c: Card) => boolean;
function applyFilter(f: Filter) {
  state.q = state.q?.filter(f);
}

function handleQuery(toks: string[]): void {
  if (state.q === undefined) {
    state.q = state.draft === undefined ? data : state.draft.picked;
  }

  if (toks.length === 0) {
    err("handleQuery() called with no tokens");
    return;
  }

  var t1 = toks.shift() as string;

  // default display based on result size
  if (t1 === "end") {
    const qCount = state.q.length;
    if (qCount < 5) t1 = "info";
    else if (qCount < 20) t1 = "list";
    else t1 = "count";
  }

  const narrowField = (field: (c: Card) => string): void => {
    if (toks.length === 0) {
      err("query field used without expected parameter");
      return;
    }

    var t2 = toks.shift() as string;
    applyFilter((c) => field(c).toLowerCase().includes(t2.toLowerCase()));
    return handleQuery(toks);
  };

  if (t1 === "info") console.log(state.q.map(info).join("\n\n"));
  else if (t1 === "list") console.log(state.q.map(colorTitle).join("\n"));
  else if (t1 === "count") console.log(state.q.length);
  else if (t1 === "t") return narrowField(title);
  else if (t1 === "m") return narrowField(mana);
  else if (t1 === "y") return narrowField(type);
  else if (t1 === "r") return narrowField(rulesOrAbilities);
  else err(`Unexpected token '${t1}'.`);
}

function draftList() {
  console.log(state.draft?.choices.map(colorTitle).join("\n"));
}

function draftInfo() {
  console.log(state.draft?.choices.map(info).join("\n"));
}

function handleDraftCmd(toks: string[]) {
  const t1 = toks.shift();

  const isDraft = state.draft !== undefined;

  // start command
  if (t1 === "start") {
    if (!isDraft) {
      state.draft = makeDraft();
      draftList();
    } else err(`Draft in progress. Use 'draft stop' before 'draft start'.`);

    return;
  }

  // draft command other than start used first
  if (!isDraft) {
    err(`Use 'draft start' before other draft commands.`);
    return;
  }

  if (t1 === "stop") {
    state.draft = undefined;
    console.log("Draft stopped.");
    return;
  } else if (t1 === "list") {
    draftList();
  } else if (t1 === "info") {
    draftInfo();
  } else if (t1 === "pick") {
    var pickTitle = toks.shift() as string;

    var {choices, picked, pool, passed} = state.draft as Draft;
    var idx = choices.findIndex((c: Card) =>
      title(c).toLowerCase().includes(pickTitle.toLowerCase())
    );

    if (idx === -1) {
      err(`Choice not found including'${pickTitle}'`);
      return;
    }

    picked.push(...(choices.splice(idx, 1) || []));
    passed.push(...choices)
    choices = pool.splice(0, Math.min(pool.length - 1, PACK_SIZE));
  }

  // state.q = data;
}

function handleCommand(toks: string[]) {
  switch (toks[0]) {
    case "draft":
      handleDraftCmd(toks.slice(1));
      return;
    default:
      handleQuery(toks);
      return;
  }
}

var readLineRec = async function () {
  rl.question(`${RESET_COL}> `, (line) => {
    if (line == "exit" || line == "quit" || line == "q") return rl.close();

    state.q = undefined;

    handleCommand(tokenize(line));

    readLineRec();
  });
};
readLineRec();
