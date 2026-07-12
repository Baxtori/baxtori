export type SourceLine = {
  number: number;
  text: string;
};

export type SyntaxToken = {
  kind: "comment" | "function" | "keyword" | "literal" | "number" | "operator" | "plain" | "property" | "string" | "type";
  text: string;
};

export type HighlightedLine = {
  number: number;
  tokens: SyntaxToken[];
};

const KEYWORDS = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "def", "default", "delete",
  "do", "else", "enum", "export", "extends", "finally", "for", "from", "function", "if", "implements", "import",
  "in", "instanceof", "interface", "let", "match", "new", "of", "package", "private", "protected", "public", "raise",
  "return", "static", "struct", "super", "switch", "throw", "trait", "try", "type", "typeof", "var", "void", "while",
  "with", "yield",
]);

const LITERALS = new Set(["false", "nil", "None", "null", "self", "this", "true", "undefined"]);
const HASH_COMMENT_LANGUAGES = new Set(["bash", "dockerfile", "makefile", "python", "ruby", "shell", "toml", "yaml", "yml"]);

function pushToken(tokens: SyntaxToken[], kind: SyntaxToken["kind"], text: string) {
  if (!text) return;
  const previous = tokens.at(-1);
  if (previous?.kind === kind) previous.text += text;
  else tokens.push({ kind, text });
}

export function highlightCodeLines(lines: readonly SourceLine[], language = "text"): HighlightedLine[] {
  let inBlockComment = false;
  let openQuote: "\"" | "'" | "`" | null = null;
  const hashComments = HASH_COMMENT_LANGUAGES.has(language.toLowerCase());

  return lines.map((line) => {
    const tokens: SyntaxToken[] = [];
    const source = line.text;
    let index = 0;

    while (index < source.length) {
      if (inBlockComment) {
        const end = source.indexOf("*/", index);
        if (end === -1) {
          pushToken(tokens, "comment", source.slice(index));
          index = source.length;
        } else {
          pushToken(tokens, "comment", source.slice(index, end + 2));
          index = end + 2;
          inBlockComment = false;
        }
        continue;
      }

      if (openQuote) {
        let end = index;
        while (end < source.length) {
          if (source[end] === openQuote && source[end - 1] !== "\\") {
            end += 1;
            openQuote = null;
            break;
          }
          end += 1;
        }
        pushToken(tokens, "string", source.slice(index, end));
        index = end;
        continue;
      }

      if (source.startsWith("//", index) || (hashComments && source[index] === "#")) {
        pushToken(tokens, "comment", source.slice(index));
        break;
      }

      if (source.startsWith("/*", index)) {
        const end = source.indexOf("*/", index + 2);
        if (end === -1) {
          pushToken(tokens, "comment", source.slice(index));
          inBlockComment = true;
          break;
        }
        pushToken(tokens, "comment", source.slice(index, end + 2));
        index = end + 2;
        continue;
      }

      const character = source[index];
      if (character === "\"" || character === "'" || character === "`") {
        let end = index + 1;
        let closed = false;
        while (end < source.length) {
          if (source[end] === character && source[end - 1] !== "\\") {
            end += 1;
            closed = true;
            break;
          }
          end += 1;
        }
        pushToken(tokens, "string", source.slice(index, end));
        if (!closed && character === "`") openQuote = character;
        index = end;
        continue;
      }

      const rest = source.slice(index);
      const whitespace = rest.match(/^\s+/)?.[0];
      if (whitespace) {
        pushToken(tokens, "plain", whitespace);
        index += whitespace.length;
        continue;
      }

      const number = rest.match(/^(?:0[xob][\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i)?.[0];
      if (number) {
        pushToken(tokens, "number", number);
        index += number.length;
        continue;
      }

      const identifier = rest.match(/^[A-Za-z_$][\w$-]*/)?.[0];
      if (identifier) {
        const previousNonSpace = source.slice(0, index).trimEnd().at(-1);
        const nextNonSpace = source.slice(index + identifier.length).trimStart().at(0);
        const kind = KEYWORDS.has(identifier)
          ? "keyword"
          : LITERALS.has(identifier)
            ? "literal"
            : previousNonSpace === "." || nextNonSpace === ":"
              ? "property"
              : nextNonSpace === "("
                ? "function"
                : /^[A-Z]/.test(identifier)
                  ? "type"
                  : "plain";
        pushToken(tokens, kind, identifier);
        index += identifier.length;
        continue;
      }

      if (/[+\-*/%=!<>|&?:~^]/.test(character)) pushToken(tokens, "operator", character);
      else pushToken(tokens, "plain", character);
      index += 1;
    }

    return { number: line.number, tokens };
  });
}
