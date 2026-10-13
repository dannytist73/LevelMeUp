// The app's version, as app.json says (M9b decision 4): shown in Settings → About and sent with every call (decision 5).
import Constants from 'expo-constants';

// Null if the build carries no version: the calls then name none, which the server counts as 0.1.0 (review: a made-up
// 0.0.0 would be below every minimum and lock a current app out).
export const APP_VERSION: string | null = Constants.expoConfig?.version ?? null;
