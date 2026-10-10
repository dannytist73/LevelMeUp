// AES-256-GCM through expo-crypto's native implementation. Keys and sealed values travel as base64 strings.
import { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import type { Probe } from '../dev/selfcheck.ts';
import { cipherProbe } from '../dev/selfcheck.ts';
import { base64ToBytes, base64ToUtf8, utf8ToBase64 } from '../lib/base64.ts';
import type { Cipher } from './sessionStorage.ts';

export const expoCipher: Cipher = {
  newKey: async () => (await AESEncryptionKey.generate(AESKeySize.AES256)).encoded('base64'),
  seal: async (key, plain) => {
    const sealed = await aesEncryptAsync(utf8ToBase64(plain), await AESEncryptionKey.import(key, 'base64'));
    return sealed.combined('base64');
  },
  open: async (key, sealed) => {
    const plain = await aesDecryptAsync(AESSealedData.fromCombined(base64ToBytes(sealed)), await AESEncryptionKey.import(key, 'base64'), { output: 'base64' });
    return base64ToUtf8(plain);
  },
};

/** Self-check: the device's AES seals and opens text with every UTF-8 length, under a throwaway key. */
export const expoCipherProbe: Probe = cipherProbe(async (plain) => {
  const key = await expoCipher.newKey();
  return expoCipher.open(key, await expoCipher.seal(key, plain));
});
