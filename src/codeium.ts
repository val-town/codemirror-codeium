import { createPromiseClient } from "@connectrpc/connect";
import { LanguageServerService } from "./api/proto/exa/language_server_pb/language_server_connect.js";
import { createConnectTransport } from "@connectrpc/connect-web";
import type {
  Document,
  GetCompletionsResponse,
} from "./api/proto/exa/language_server_pb/language_server_pb.js";
import type { CodeiumConfig } from "./config.js";
import type { ChangeSpec } from "@codemirror/state";
import type { PartialMessage } from "@bufbuild/protobuf";

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
export function simplifyCompletions(completions: GetCompletionsResponse) {
  return completions.completionItems[0]!.completionParts.filter((part) => {
    // Type 3 overwrites existing text. Maybe we need this eventually,
    // but not right now and it usually is duplicative.
    return part.type !== 3;
  }).map((part) => {
    return {
      ...part,
      offset: Number(part.offset),
      text: part.type === 2 ? `\n${part.text}` : part.text,
    };
  });
}

export function completionsToChangeSpec(
  completions: GetCompletionsResponse,
): ChangeSpec[] {
  return simplifyCompletions(completions).map((part) => ({
    from: Number(part.offset),
    to: Number(part.offset),
    insert: part.text,
  }));
}
