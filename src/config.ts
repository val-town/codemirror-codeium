import { Facet, combineConfig } from "@codemirror/state";
import { Language } from "./api/proto/exa/codeium_common_pb/codeium_common_pb.js";
import type { Document } from "./api/proto/exa/language_server_pb/language_server_pb.js";
import type { PartialMessage } from "@bufbuild/protobuf";
import type { CompletionContext } from "@codemirror/autocomplete";
import { DefaultCycleWidget } from "./defaultCycleWidget.js";

export interface CodeiumConfig {
  /**
   * Codeium API key
   */
  apiKey: string;

  /**
   * The programming language of the given document.
   */
  language?: Language;
  /**
   * Time in millseconds after typing to fetch
   * completions from codeium
   */
  timeout?: number;

  authSource?: number;

  /**
   * An optional method that lets you decide whether Codeium
   * should be triggered at a particular place in a document.
   *
   * Might be useful for if you're fighting with overlapping
   * autocomplete sources.
   */
  shouldComplete?: (context: CompletionContext) => boolean;

  /**
   * The class for the widget that is shown at the end a suggestion
   * when there are multiple suggestions to cycle through.
   */
  widgetClass?: typeof DefaultCycleWidget | null;
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
        widgetClass: DefaultCycleWidget,
      },
      {},
    );
  },
});

type OtherDocuments = PartialMessage<Document>[];

export interface CodeiumOtherDocumentsConfig {
  override?: () => Promise<OtherDocuments> | OtherDocuments;
}

/**
 * Configuration for other documents included with the completion
 * request. Adding other documents helps you get more accurate
 * suggestions by adding context.
 */
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
