// One way to save (2/11, the UX proposal): every change to his settings is kept at once, and the shell's small
// "נשמר ✓" (ui.tsx, SavedToast) says so for two seconds.
export const SAVED = 'expo-saved';
export function notifySaved() { dispatchEvent(new Event(SAVED)); }
