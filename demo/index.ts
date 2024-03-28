import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { copilotPlugin } from "../src/plugin.js";

(async () => {
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
      }),
    ],
    parent: document.querySelector("#editor")!,
  });
})().catch((e) => console.error(e));
