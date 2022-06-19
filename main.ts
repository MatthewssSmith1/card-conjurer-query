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

// import card conjurer file
let data = JSON.parse(
  readFileSync("saved-cards.cardconjurer") as any
) as Card[];

// print intermediate verison (TODO: convert to simpler format)
writeFileSync(
  "condensed.json",
  JSON.stringify(
    data.map((c) => ({
      text: c.data.text,
    }))
  )
);

// print cards that have image data stored in card conjurer file
data
  .filter((c) => c.data.artSource.substring(0, 10) === "data:image")
  .forEach((c) => console.log(c.data.text.title + " image data loaded"));

console.log(`${data.length} cards loaded`);

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

type Draft = {
  type: "single5";
  picked: Card[];
};
const DRAFT_DEFAULT: Draft = {
  type: "single5",
  picked: [],
};

type State = {
  q?: Card[];
  draft?: Draft;
};

var state: State = {
  q: undefined,
  draft: undefined,
};

function narrow

function handleQuery(toks: string[]) {
  if (state.q === undefined) {
    state.q = state.draft === undefined ? data : state.draft.picked;
  }

  if (toks.length === 0) {
    err("handleQuery() called with no tokens");
    return;
  }

  if (toks.length === 1) {
    if (toks[0] === "end") {
      // print q
    } else
      err("Last token in handleQuery() is not the expected 'end' token.");
  }

  switch (toks.shift()) {
    case 't':
      
  }
}

function handleDraftCmd(toks: string[]) {
  switch (toks.shift()) {
    case "start":
      if (state.draft === undefined) state.draft = DRAFT_DEFAULT;
      else err(`Draft in progress. Use 'draft stop' first.`);
      break;
    case "stop":
      state.draft = undefined;
      break;
    default:
      return;
  }

  state.q = data;
}

function handleCommand(toks: string[]) {
  switch (toks.shift()) {
    case "draft":
      handleDraftCmd(toks);
      return;
    default:
      handleQuery(toks);
      return;
  }
}

var readLineRec = async function () {
  rl.question(`${RESET_COL}> `, (line) => {
    if (line == "exit" || line == "quit" || line == "q") return rl.close();

    handleCommand(tokenize(line));

    console.log(`${state.draft === undefined ? "no draft" : "draft"}`);

    readLineRec();
  });
};
readLineRec();
