export function filterRelationships(relationships, { fromCharacterIds = [], toCharacterIds = [] } = {}) {
  const selectedFromCharacterIds = new Set(fromCharacterIds.map(String).filter(Boolean));
  const selectedToCharacterIds = new Set(toCharacterIds.map(String).filter(Boolean));
  return relationships.filter((relationship) => {
    const matchesFromCharacter = selectedFromCharacterIds.size === 0
      || selectedFromCharacterIds.has(String(relationship?.fromCharacterId ?? ""));
    const matchesToCharacter = selectedToCharacterIds.size === 0
      || selectedToCharacterIds.has(String(relationship?.toCharacterId ?? ""));
    return matchesFromCharacter && matchesToCharacter;
  });
}
