# Block Renderer Partial Updates

This note explains the adjustments we made to `assets/js/block-renderer.js` so the editor refreshes only the parts of a block whose attributes actually change, instead of remounting the entire block after every server response.

## What Changed

- **Path-based React keys**: Each DOM node generated from the server HTML now receives a key derived from its structural path (`parent.childIndex`). Because the server tends to return the same markup order between renders, React can compare the incoming tree against the existing one and reuse nodes whose keys match. Previously we incremented a global counter when parsing, so every parse produced brand-new keys and React had no choice but to discard the old subtree.
- **Child traversal aware of hierarchy**: When we recurse through child nodes we pass the computed path to descendants. That means a paragraph inside a wrapper might get `wrapper.0`, the next sibling `wrapper.1`, and so on. If only the text of `wrapper.0` changes, React updates that node while leaving `wrapper.1` (and everything below it) untouched.
- **Loading state reuse**: During attribute edits we keep the last rendered markup in place while a new REST request is running. Only the initial render shows a placeholder spinner. This prevents React from tearing down the block tree before the next render, so the path-based keys can do their job.

## Result

When you tweak a block attribute, `createServerRenderComponent` receives the updated server HTML but React only patches the nodes whose keys align with the changed content. Visual flicker disappears and inner blocks or complex layouts stay stable between edits.
