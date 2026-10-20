// What the player reads when the server refuses one of their actions (roadmap, "Carried forward from M3": show the
// notice, then drop the event). Plain words, never blame, never red. The words live in the content package (premium pass C4).
import { NOTICE_OTHER, NOTICE_TEXT } from '@levelmeup/content';

const TEXT = NOTICE_TEXT;

export type NoticeCode = keyof typeof TEXT;
export const NOTICE_CODES = Object.keys(TEXT) as NoticeCode[];

export function noticeText(code: string): string {
  return Object.hasOwn(TEXT, code) ? TEXT[code as NoticeCode] : NOTICE_OTHER;
}
