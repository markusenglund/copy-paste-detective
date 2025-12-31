export function slugify(str: string): string {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export function slugifyTruncated(text: string, maxChars: number): string {
  const slugified = slugify(text);
  const words = slugified.split("-");

  // Special case: first word is longer than maxChars
  if (words[0].length > maxChars) {
    return words[0].slice(0, maxChars);
  }

  let result = "";
  for (const word of words) {
    const separator = result.length > 0 ? "-" : "";
    const candidate = result + separator + word;
    if (candidate.length > maxChars) {
      break;
    }
    result = candidate;
  }

  return result;
}
