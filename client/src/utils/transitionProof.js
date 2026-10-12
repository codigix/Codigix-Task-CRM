import React from 'react';
import { createRoot } from 'react-dom/client';
import TransitionProofModal from '../components/common/TransitionProofModal';

/**
 * Opens the proof dialog and resolves with { note, links, files }, or null if cancelled.
 * Mounted on its own root so it works from anywhere, including the fetch wrapper.
 * Only one dialog at a time: a second request waits for the first to close.
 */
let queue = Promise.resolve();

export const askForProof = (info) => {
  const run = () => new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (result) => {
      root.unmount();
      host.remove();
      resolve(result);
    };
    root.render(<TransitionProofModal info={info} onDone={done} />);
  });
  const next = queue.then(run, run);
  queue = next.catch(() => null);
  return next;
};
