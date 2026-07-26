import { pinyin } from "pinyin-pro";

export const RELATIONSHIP_SEARCH_POLICY_VERSION = 1;

export function normalizeRelationshipSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("zh-CN");
}

function encodedCodePoint(value: string): string {
  return [...value].map((character) => character.codePointAt(0)!.toString(16)).join("x");
}

function safePinyinToken(value: string): string {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("zh-CN").replaceAll("ü", "v");
  return /^[a-z0-9]+$/u.test(normalized) ? `p${normalized}` : `u${encodedCodePoint(normalized)}`;
}

export function relationshipCharacterTokens(value: string): string[] {
  return [...normalizeRelationshipSearchText(value)].map((character) => `u${encodedCodePoint(character)}`);
}

export function relationshipPinyinSyllables(value: string): string[] {
  const normalized = normalizeRelationshipSearchText(value);
  return pinyin(normalized, { toneType: "none", type: "array" })
    .map((item) => item.normalize("NFKC").toLocaleLowerCase("zh-CN").replaceAll("ü", "v"));
}

export function relationshipPinyinTokens(value: string): string[] {
  return relationshipPinyinSyllables(value).map(safePinyinToken);
}

export function relationshipCharacterTokenText(value: string): string {
  return relationshipCharacterTokens(value).join(" ");
}

export function relationshipPinyinTokenText(value: string): string {
  return relationshipPinyinTokens(value).join(" ");
}

export function ftsPhrase(tokens: string[]): string {
  return `"${tokens.join(" ").replaceAll('"', '""')}"`;
}

export function damerauLevenshteinDistance(left: readonly string[], right: readonly string[], maximum = Number.POSITIVE_INFINITY): number {
  if (Math.abs(left.length - right.length) > maximum) return maximum + 1;
  const previousPrevious = new Array<number>(right.length + 1).fill(0);
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = new Array<number>(right.length + 1).fill(0);
    current[0] = leftIndex;
    let rowMinimum = current[0];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex]! + 1,
        current[rightIndex - 1]! + 1,
        previous[rightIndex - 1]! + substitutionCost
      );
      if (leftIndex > 1 && rightIndex > 1
        && left[leftIndex - 1] === right[rightIndex - 2]
        && left[leftIndex - 2] === right[rightIndex - 1]) {
        current[rightIndex] = Math.min(current[rightIndex]!, previousPrevious[rightIndex - 2]! + 1);
      }
      rowMinimum = Math.min(rowMinimum, current[rightIndex]!);
    }
    if (rowMinimum > maximum) return maximum + 1;
    for (let index = 0; index < previous.length; index += 1) previousPrevious[index] = previous[index]!;
    previous = current;
  }
  return previous[right.length]!;
}

export type ApproximateNameMatch = {
  observed: string;
  start: number;
  end: number;
  characterDistance: number;
  pinyinDistance: number;
};

export class RelationshipApproximateMatchLimitError extends Error {
  constructor(readonly maximumCandidates: number) {
    super(`Approximate relationship match candidates exceeded ${maximumCandidates}`);
    this.name = "RelationshipApproximateMatchLimitError";
  }
}

export function findApproximateNameMatches(
  content: string,
  reference: string,
  limit = 3,
  excludedObserved: ReadonlySet<string> = new Set(),
  maximumCandidates = 256
): ApproximateNameMatch[] {
  const normalizedContent = normalizeRelationshipSearchText(content);
  const normalizedReference = normalizeRelationshipSearchText(reference).trim();
  const sourceCharacters = [...normalizedContent];
  const referenceCharacters = [...normalizedReference];
  if (referenceCharacters.length < 2 || sourceCharacters.length === 0) return [];
  const hanReference = referenceCharacters.every((character) => /\p{Script=Han}/u.test(character));
  const normalizedExcluded = new Set([...excludedObserved].map((item) => normalizeRelationshipSearchText(item).trim()));
  const referencePinyin = relationshipPinyinSyllables(normalizedReference);
  const sourcePinyin = relationshipPinyinSyllables(normalizedContent);
  const matches: ApproximateNameMatch[] = [];
  const seen = new Set<string>();
  for (const windowLength of [referenceCharacters.length, referenceCharacters.length - 1, referenceCharacters.length + 1]) {
    if (windowLength < 1) continue;
    for (let start = 0; start + windowLength <= sourceCharacters.length; start += 1) {
      const observedCharacters = sourceCharacters.slice(start, start + windowLength);
      if (observedCharacters.length < 2) continue;
      if (hanReference && !observedCharacters.every((character) => /\p{Script=Han}/u.test(character))) continue;
      const observed = observedCharacters.join("");
      if (!observed.trim() || observed === normalizedReference || normalizedExcluded.has(observed)) continue;
      const characterDistance = damerauLevenshteinDistance(referenceCharacters, observedCharacters, 1);
      const observedPinyin = sourcePinyin.slice(start, start + windowLength);
      const pinyinDistance = damerauLevenshteinDistance(referencePinyin, observedPinyin, 1);
      if (characterDistance > 1 && pinyinDistance > 1) continue;
      const key = `${start}:${observed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ observed, start, end: start + windowLength, characterDistance, pinyinDistance });
      if (matches.length > maximumCandidates) throw new RelationshipApproximateMatchLimitError(maximumCandidates);
    }
  }
  const ranked = matches.sort((left, right) =>
    Math.min(left.characterDistance, left.pinyinDistance) - Math.min(right.characterDistance, right.pinyinDistance)
    || Math.abs([...left.observed].length - referenceCharacters.length) - Math.abs([...right.observed].length - referenceCharacters.length)
    || left.start - right.start
  );
  const selected: ApproximateNameMatch[] = [];
  for (const match of ranked) {
    if (selected.some((item) => match.start < item.end && match.end > item.start)) continue;
    selected.push(match);
    if (selected.length >= limit) break;
  }
  return selected.sort((left, right) => left.start - right.start);
}
