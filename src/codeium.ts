import { createPromiseClient } from "@connectrpc/connect";
import { LanguageServerService } from "./api/proto/exa/language_server_pb/language_server_connect.js";
import { createConnectTransport } from "@connectrpc/connect-web";
import type {
  Document,
  GetCompletionsResponse,
} from "./api/proto/exa/language_server_pb/language_server_pb.js";
import type { CodeiumConfig } from "./config.js";
import type { PartialMessage } from "@bufbuild/protobuf";
import type { SimpleChangeSpec } from "./types.js";

// This is the same as the monaco editor example
const transport = createConnectTransport({
  baseUrl: "https://web-backend.codeium.com",
  useBinaryFormat: true,
});

const client = createPromiseClient(LanguageServerService, transport);

/**
 * Note that this won't be available in 'insecure contexts',
 * websites served under HTTP not HTTPS, but those are rare.
 * And it'll work in localhost for development.
 */
const sessionId = crypto.randomUUID();

export async function getCodeiumCompletions({
  text,
  cursorOffset,
  config,
  otherDocuments,
}: {
  text: string;
  cursorOffset: number;
  config: CodeiumConfig;
  otherDocuments: PartialMessage<Document>[];
}) {
  return (await client.getCompletions(
    {
      metadata: {
        ideName: "web",
        ideVersion: "0.0.5",
        extensionName: "@valtown/codemirror-codeium",
        extensionVersion: "1.0.0",
        apiKey: config.apiKey,
        sessionId: sessionId,
        authSource: config.authSource,
      },
      document: {
        text: text,
        cursorOffset: BigInt(cursorOffset),
        language: config.language,
        // TODO: not sure why we have both language and
        // editorlanguage
        // The types don't like this here, but it works.
        editorLanguage: "typescript",
        lineEnding: "\n",
      },
      editorOptions: {
        tabSize: 2n,
        insertSpaces: true,
      },
      otherDocuments: otherDocuments,
      multilineConfig: undefined,
    },
    {
      // signal,
      headers: {
        Authorization: `Basic ${config.apiKey}-${sessionId}`,
      },
    },
    // TODO: why doesn't this work by default?
  )) as GetCompletionsResponse;
}

/**
 * Make the body of the response a bit easier to work with:
 * turn a BigInt into an int in the response so that it can
 * be used with CodeMirror directly, and avoid using some
 * complex kinds of completions.
 */
export function completionsToChangeSpec(
  completions: GetCompletionsResponse,
): SimpleChangeSpec[][] {
  return completions.completionItems.map((item) => {
    /**
     * Add absolute offsets for the suggestion text insertions
     * so that we can add matching decorations.
     */
    let combinedOffset = 0;
    return item.completionParts
      .filter((part) => {
        // Type 3 overwrites existing text. Maybe we need this eventually,
        // but not right now and it usually is duplicative.
        return part.type !== 3;
      })
      .map((part): SimpleChangeSpec => {
        const offset = Number(part.offset);
        const text = part.type === 2 ? `\n${part.text}` : part.text;
        const res: SimpleChangeSpec = {
          absoluteStartPos: combinedOffset + offset,
          absoluteEndPos: combinedOffset + offset + text.length,
          from: offset,
          to: offset,
          insert: text,
        };
        combinedOffset += text.length;
        return res;
      });
  });
}
