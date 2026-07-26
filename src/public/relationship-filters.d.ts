type RelationshipFilterItem = {
  id?: string;
  fromCharacterId?: string | null;
  toCharacterId?: string | null;
};

export declare function filterRelationships<T extends RelationshipFilterItem>(
  relationships: T[],
  filters?: { fromCharacterIds?: string[]; toCharacterIds?: string[] }
): T[];
