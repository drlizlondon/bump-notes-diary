// Service pause (coordinator decision 2026-10-11; lifted 2026-10-29 once live health was 200): the Azure subscription that
// holds accounts and saved records is disabled, so sign-up, saving, uploads and
// the forms that write to it cannot work. While this is true, those entry points
// show PAUSE_MESSAGE instead. Set to false (one line) once the backend is back.
export const SERVICE_PAUSED = false;

export const PAUSE_MESSAGE =
  "New accounts and saving are paused while we move to a new server. We are working on it.";
