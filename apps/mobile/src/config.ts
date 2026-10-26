/**
 * EXPO_PUBLIC_API_URL comes from apps/mobile/.env (not committed; see .env.example).
 * At home: the Mac's LAN IP, e.g. http://192.168.1.20:3000. Later: the VPS (H-01).
 */
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
    /\/+$/,
    '',
  ),
};
