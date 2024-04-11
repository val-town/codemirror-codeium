import { Facet, combineConfig } from "@codemirror/state";
import { Language } from "./api/proto/exa/codeium_common_pb/codeium_common_pb.js";
import { Document } from "./api/proto/exa/language_server_pb/language_server_pb.js";
import { type PartialMessage } from "@bufbuild/protobuf";

export interface CodeiumConfig {
  /**
   * Codeium API key
   */
  apiKey: string;
  language?: Language;
  /**
   * Time in millseconds after typing to fetch
   * completions from codeium
   */
  timeout?: number;

  authSource?: number;
}

export const codeiumConfig = Facet.define<
  CodeiumConfig,
  Required<CodeiumConfig>
>({
  combine(configs) {
    return combineConfig<Required<CodeiumConfig>>(
      configs,
      {
        language: Language.TYPESCRIPT,
        timeout: 150,
      },
      {},
    );
  },
});

type OtherDocuments = PartialMessage<Document>[];

export interface CodeiumOtherDocumentsConfig {
  override?: () => Promise<OtherDocuments> | OtherDocuments;
}

export const codeiumOtherDocumentsConfig = Facet.define<
  CodeiumOtherDocumentsConfig,
  Required<CodeiumOtherDocumentsConfig>
>({
  combine(configs) {
    return combineConfig<Required<CodeiumOtherDocumentsConfig>>(
      configs,
      {
        override: () => [],
      },
      {},
    );
  },
});
