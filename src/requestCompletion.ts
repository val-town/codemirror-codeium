import { completionStatus } from "@codemirror/autocomplete";
import { ChangeSet, Transaction } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { completionsToChangeSpec, getCodeiumCompletions } from "./codeium.js";
import { addSuggestions } from "./effects.js";
import { copilotEvent, copilotIgnore } from "./annotations.js";
import { codeiumConfig, codeiumOtherDocumentsConfig } from "./config.js";

/**
 * Inner 'requestCompletion' API, which can optionally
 * be run all the time if you set `alwaysOn`
 */
export async function requestCompletion(view: EditorView, lastPos?: number) {
  const config = view.state.facet(codeiumConfig);
  const { override } = view.state.facet(codeiumOtherDocumentsConfig);

  const otherDocuments = await override();

  // Get the current position and source
  const state = view.state;
  const pos = state.selection.main.head;
  const source = state.doc.toString();

  // Request completion from the server
  try {
    const completionResult = await getCodeiumCompletions({
      text: source,
      cursorOffset: pos,
      config,
      otherDocuments,
    });

    if (!completionResult || completionResult.completionItems.length === 0) {
      return;
    }

    // Check if the position is still the same. If
    // it has changed, ignore the code that we just
    // got from the API and don't show anything.
    if (
      !(
        (lastPos === undefined || pos === lastPos) &&
        completionStatus(view.state) !== "active" &&
        view.hasFocus
      )
    ) {
      return;
    }

    // Dispatch an effect to add the suggestion
    // If the completion starts before the end of the line,
    // check the end of the line with the end of the completion
    const changeSpecs = completionsToChangeSpec(completionResult);

    const index = 0;
    const firstSpec = changeSpecs.at(index);
    if (!firstSpec) return;
    const insertChangeSet = ChangeSet.of(firstSpec, state.doc.length);
    const reverseChangeSet = insertChangeSet.invert(state.doc);

    view.dispatch({
      changes: insertChangeSet,
      effects: addSuggestions.of({
        index,
        reverseChangeSet,
        changeSpecs,
      }),
      annotations: [
        copilotIgnore.of(null),
        copilotEvent.of(null),
        Transaction.addToHistory.of(false),
      ],
    });
  } catch (error) {
    console.warn("copilot completion failed", error);
    // Javascript wait for 300ms for some reason is necessary here.
    // TODO - FIGURE OUT WHY THIS RESOLVES THE BUG

    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
