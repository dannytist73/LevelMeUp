// The project the app talks to. Both values are public by design: the publishable key only lets a client reach Auth
// and the functions, which check every request (architecture §8). Secret and service-role keys never come here.
export const SUPABASE_URL = "https://knlgpcwoaaygncmlnbsm.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VELJeUV6Sl4BoSnkz9oSdA_CRrNE5if";
/**
 * M13: RevenueCat's public Android SDK key (it starts `goog_`). Public by design: it can only list Plus's offers and
 * start a purchase through Google Play; what a player owns is decided on the server with the secret key
 * (LMU_REVENUECAT_SECRET), which never comes here. Empty until the owner sets RevenueCat up: Plus then isn't on sale.
 */
export const REVENUECAT_ANDROID_KEY = "";
