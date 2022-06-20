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
    case "quit":
      return "q";
    default:
      return tok;
  }
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
