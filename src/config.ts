import { Facet, combineConfig } from "@codemirror/state";
import { Language } from "./api/proto/exa/codeium_common_pb/codeium_common_pb.js";

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
