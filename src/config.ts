import { Facet, combineConfig } from "@codemirror/state";
import { Language } from "./api/proto/exa/codeium_common_pb/codeium_common_pb.js";

export interface CodeiumConfig {
  apiKey: string;
  language?: Language;
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
      },
      {},
    );
  },
});
