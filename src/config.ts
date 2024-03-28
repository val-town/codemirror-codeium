import { Facet, combineConfig } from "@codemirror/state";

export interface CodeiumConfig {
  apiKey: string;
}

export const codeiumConfig = Facet.define<
  CodeiumConfig,
  Required<CodeiumConfig>
>({
  combine(configs) {
    return combineConfig<Required<CodeiumConfig>>(configs, {}, {});
  },
});
