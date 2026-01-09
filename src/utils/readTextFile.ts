import jschardet from "jschardet";
import iconv from "iconv-lite";
import fs from "node:fs";

// Figure out the encoding and then read the file
export function readTextFile(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const encoding = jschardet.detect(buffer).encoding;
  const text = iconv.decode(buffer, encoding);
  return text;
}
