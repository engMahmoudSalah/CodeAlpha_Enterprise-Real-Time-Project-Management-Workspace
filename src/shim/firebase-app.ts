// Stand-in for firebase/app: the app now talks to its own Worker API.
const apps: any[] = [];
export function initializeApp(cfg: any) { const a = { options: cfg, name: '[DEFAULT]' }; apps.push(a); return a; }
export function getApps() { return apps; }
export function getApp() { return apps[0]; }
