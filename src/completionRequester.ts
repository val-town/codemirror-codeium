import { CompletionContext, completionStatus } from "@codemirror/autocomplete";
import { ChangeSet, Transaction } from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import { completionsToChangeSpec, getCodeiumCompletions } from "./codeium.js";
import {
  acceptSuggestion,
  addSuggestions,
  clearSuggestion,
} from "./effects.js";
import { completionDecoration } from "./completionDecoration.js";
import { copilotEvent, copilotIgnore } from "./annotations.js";
import { codeiumConfig, codeiumOtherDocumentsConfig } from "./config.js";

/**
 * To request a completion, the document needs to have been
 * updated and the update should not have been because
 * of accepting or clearing a suggestion.
 */
function shouldRequestCompletion(update: ViewUpdate) {
  return (
    update.docChanged &&
    !update.transactions.some((tr) =>
      tr.effects.some((e) => e.is(acceptSuggestion) || e.is(clearSuggestion)),
    )
  );
}

/**
 * Don't request a completion if we've already
 * done so, or it's a copilot event we're responding
 * to, or if the view is not focused.
 */
function shouldIgnoreUpdate(update: ViewUpdate) {
  // not focused
  if (!update.view.hasFocus) return true;

  // contains ghost text
  if (update.state.field(completionDecoration)) return true;

  // is autocompleting
  if (completionStatus(update.state) === "active") return true;

  // bad update
  for (const tr of update.transactions) {
    if (tr.annotation(copilotEvent) !== undefined) {
      return true;
    }
  }
}

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
    // Javascript wait for 500ms for some reason is necessary here.
    // TODO - FIGURE OUT WHY THIS RESOLVES THE BUG

    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * A view plugin that requests completions from the server after a delay
 */
export function completionRequester() {
  let timeout: number | null = null;
  let lastPos = 0;

  return EditorView.updateListener.of((update: ViewUpdate) => {
    const config = update.view.state.facet(codeiumConfig);
    if (!config.alwaysOn) return;

    if (!shouldRequestCompletion(update)) return;

    // Cancel the previous timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    if (shouldIgnoreUpdate(update)) {
      return;
    }

    // Get the current position and source
    const state = update.state;
    const pos = state.selection.main.head;

    // If we've configured a custom rule for when to show completions
    // and that rule says no, don't offer completions.
    if (
      config.shouldComplete &&
      !config.shouldComplete(
        new CompletionContext(update.view.state, pos, false),
      )
    ) {
      return;
    }

    // Set a new timeout to request completion
    timeout = setTimeout(async () => {
      // Check if the position has changed
      if (pos !== lastPos) return;

      await requestCompletion(update.view, lastPos);
    }, config.timeout);

    // Update the last position
    lastPos = pos;
  });
}
