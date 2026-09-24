const BOM = String.fromCharCode(0xfeff);

/**
 * The password from piped input: its first line, without the line ending and
 * without the byte-order mark Windows PowerShell adds when its output encoding
 * is UTF-8 (otherwise that invisible character becomes part of the password).
 */
export function firstLineOfInput(data: string): string {
  const text = data.startsWith(BOM) ? data.slice(1) : data;
  return text.split(/\r\n|\r|\n/)[0] ?? "";
}
