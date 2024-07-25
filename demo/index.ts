import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import {
  codeiumOtherDocumentsConfig,
  Language,
  copilotPlugin,
} from "../src/plugin.js";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { startCompletion } from "../src/commands.js";

new EditorView({
  doc: "// Factorial function",
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
      shouldComplete(context) {
        if (context.tokenBefore(["String"])) {
          return true;
        }
        const match = context.matchBefore(/(@(?:\w*))(?:[./](\w*))?/);
        return !match;
      },
    }),
  ],
  parent: document.querySelector("#editor")!,
});

new EditorView({
  doc: "// Factorial function (explicit trigger)",
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
      shouldComplete(context) {
        if (context.tokenBefore(["String"])) {
          return true;
        }
        const match = context.matchBefore(/(@(?:\w*))(?:[./](\w*))?/);
        return !match;
      },
      alwaysOn: false,
    }),
    keymap.of([
      {
        key: "Cmd-k",
        run: startCompletion,
      },
    ]),
  ],
  parent: document.querySelector("#editor-explicit")!,
});

new EditorView({
  doc: "def hi_python():",
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
