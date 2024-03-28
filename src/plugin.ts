import { EditorView } from "@codemirror/view";
import { Extension, Prec } from "@codemirror/state";
import { completionDecoration } from "./completionDecoration.js";
import { completionRequester } from "./completionRequester.js";
import {
  sameKeyCommand,
  rejectSuggestionCommand,
  acceptSuggestionCommand,
} from "./commands.js";
import { CodeiumConfig, codeiumConfig } from "./config.js";
import { Language } from "./api/proto/exa/codeium_common_pb/codeium_common_pb.js";

function isDecorationClicked(view: EditorView) {
  let inRange = false;
  const head = view.state.selection.asSingle().ranges.at(0)?.head;
  if (head !== undefined) {
    view.state
      .field(completionDecoration)
      .decorations?.between(head, head, () => {
        inRange = true;
      });
    return inRange;
  }
  return false;
}

function completionPlugin() {
  return EditorView.domEventHandlers({
    keydown(event, view) {
      if (
        event.key !== "Shift" &&
        event.key !== "Control" &&
        event.key !== "Alt" &&
        event.key !== "Meta"
      ) {
        return sameKeyCommand(view, event.key);
      } else {
        return false;
      }
    },
    mouseup(_event, view) {
      if (isDecorationClicked(view)) {
        return acceptSuggestionCommand(view);
      } else {
        return rejectSuggestionCommand(view);
      }
    },
  });
}

function viewCompletionPlugin() {
  return EditorView.updateListener.of((update) => {
    if (update.focusChanged) {
      rejectSuggestionCommand(update.view);
    }
  });
}

export { Language };

export function copilotPlugin(config: CodeiumConfig): Extension {
  return [
    codeiumConfig.of(config),
    completionDecoration,
    Prec.highest(completionPlugin()),
    Prec.highest(viewCompletionPlugin()),
    completionRequester(),
  ];
}
