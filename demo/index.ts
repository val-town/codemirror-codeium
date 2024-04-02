import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { Language, copilotPlugin } from "../src/plugin.js";
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
    copilotPlugin({
      apiKey: "d49954eb-cfba-4992-980f-d8fb37f0e942",
      otherDocuments: [
        {
          absolutePath: "https://esm.town/v/foo.ts",
          text: "export const foo = 10;",
          language: Language.TYPESCRIPT,
          editorLanguage: "typescript",
        },
      ],
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
