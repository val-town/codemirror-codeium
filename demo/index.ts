import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import {
  codeiumOtherDocumentsConfig,
  Language,
  copilotPlugin,
} from "../src/plugin.js";
import { python } from "@codemirror/lang-python";

new EditorView({
  doc: `let hasAnError: string = 10;

function increment(num: number) {
  return num + 1;
}

increment('not a number');`,
  extensions: [
    basicSetup,
    javascript({
      typescript: true,
      jsx: true,
    }),
    codeiumOtherDocumentsConfig.of({
      override: () => [
        {
          absolutePath: "https://esm.town/v/foo.ts",
          text: `export const foo = 10;

const hiddenValue = "https://macwright.com/"`,
          language: Language.TYPESCRIPT,
          editorLanguage: "typescript",
        },
      ],
    }),
    copilotPlugin({
      apiKey: "d49954eb-cfba-4992-980f-d8fb37f0e942",
    }),
  ],
  parent: document.querySelector("#editor")!,
});

new EditorView({
  doc: `def hi_python():`,
  extensions: [
    basicSetup,
    python(),
    copilotPlugin({
      apiKey: "d49954eb-cfba-4992-980f-d8fb37f0e942",
      language: Language.PYTHON,
    }),
  ],
  parent: document.querySelector("#editor-python")!,
});
