/**
 * Whether `value` is accepted as a `timeZone` by Intl (IANA names such as Asia/Kolkata).
 * Invalid strings like "Test Hello" return false.
 */
export function isValidIanaTimeZone(value: string): boolean {
  const tz = value.trim();
  if (!tz || tz.length > 120) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
