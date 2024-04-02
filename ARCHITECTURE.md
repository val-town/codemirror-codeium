# Architecture

This module requests autocompletions of code from [Codeium](https://codeium.com/),
shows "ghost text" for them, and allows users to accept them by clicking
or hitting Tab.

## Ghost text

The way that this shows ghost text is quite different from how [codemirror-copilot](https://github.com/asadm/codemirror-copilot) does it, and is derived from the code
in [modeling-app](https://github.com/KittyCAD/modeling-app), which is then derived
from the code in [Cursor](https://cursor.sh/).

In codemirror-copilot, ghost text is [based on widgets](https://github.com/asadm/codemirror-copilot/blob/09e737a3da8449d5d7f0b5cd8266688afaf3baa5/packages/codemirror-copilot/src/inline-suggestion.ts#L60-L75) -
displaying a [CodeMirror widget](https://codemirror.net/docs/ref/#view.Decoration^widget)
inline with text. This is simple, but has the drawbacks of the ghost
text being non-highlighted, and ghost text does not create additional
line numbers in the line gutter, if there is one.

In this module, ghost text is added to the real text in the editor, but
we use an [addToHistory](https://codemirror.net/docs/ref/#state.Transaction^addToHistory)
annotation to ensure that it is not added to history. This produces ghost
text that looks more cohesive with the rest of the design of the editor,
but it has the drawback of producing events that upstream consumers
might confuse with user edits. We provide the `copilotIgnore` annotation
and the `shouldTakeUpdate` method to help with this potential confusion.
