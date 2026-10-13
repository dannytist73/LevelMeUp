// The app's version, as app.json says (M9b decision 4): shown in Settings → About and sent with every call (decision 5).
import Constants from 'expo-constants';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';
