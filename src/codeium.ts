import { createPromiseClient } from "@connectrpc/connect";
import { LanguageServerService } from "./api/proto/exa/language_server_pb/language_server_connect.js";
import { createConnectTransport } from "@connectrpc/connect-web";
import { Language } from "./api/proto/exa/codeium_common_pb/codeium_common_pb.js";
import { GetCompletionsResponse } from "./api/proto/exa/language_server_pb/language_server_pb.js";

// This is the same as the monaco editor example
const EDITOR_API_KEY = "d49954eb-cfba-4992-980f-d8fb37f0e942";

const transport = createConnectTransport({
  baseUrl: "https://web-backend.codeium.com",
  useBinaryFormat: true,
});

const client = createPromiseClient(LanguageServerService, transport);

const sessionId = crypto.randomUUID();

export async function getCodeiumCompletions({
  text,
  cursorOffset,
}: {
  text: string;
  cursorOffset: number;
}) {
  const completions = (await client.getCompletions(
    {
      metadata: {
        ideName: "web",
        ideVersion: "unknown",
        extensionName: "@val-town/unofficial",
        extensionVersion: "unknown",
        apiKey: EDITOR_API_KEY,
        sessionId: sessionId,
      },
      document: {
        text: text,
        cursorOffset: BigInt(cursorOffset),
        language: Language.TYPESCRIPT,
        // The types don't like this here, but it works.
        editorLanguage: "typescript", // Language.TYPESCRIPT as unknown as string,
        lineEnding: "\n",
      },
      editorOptions: {
        tabSize: 2n,
        insertSpaces: true,
      },
      otherDocuments: [],
      multilineConfig: undefined,
    },
    {
      // signal,
      headers: {
        Authorization: `Basic ${EDITOR_API_KEY}-${sessionId}`,
      },
    },
    // TODO: why doesn't this work by default?
  )) as GetCompletionsResponse;

  const parts = completions.completionItems[0]!.completionParts.filter(
    (part) => {
      // Type 3 overwrites existing text. Maybe we need this eventually,
      // but not right now and it usually is duplicative.
      return part.type !== 3;
    },
  ).map((part) => {
    return {
      ...part,
      offset: Number(part.offset),
      text: part.type === 2 ? `\n${part.text}` : part.text,
    };
  });

  return parts;
}
