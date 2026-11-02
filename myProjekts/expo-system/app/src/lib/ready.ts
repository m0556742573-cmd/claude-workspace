// What the "מוכן לאקספו" board cannot ask the server (2/11): whether the booth's sign was printed, on this device.
const KEY = 'expo-sign-printed';
export function signPrinted(): boolean { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
export function markSignPrinted() { try { localStorage.setItem(KEY, '1'); } catch { /* the device may not keep it */ } }
