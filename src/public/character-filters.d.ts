type CharacterFilterItem = {
  id?: string;
  race?: { id?: string | null } | null;
  raceId?: string | null;
  organizations?: Array<{ id?: string | null }> | null;
};

export declare function filterCharacters<T extends CharacterFilterItem>(
  characters: T[],
  filters?: { raceIds?: string[]; organizationIds?: string[] }
): T[];

export declare function paginateCharacters<T>(
  characters: T[],
  page: number,
  limit: number
): {
  items: T[];
  page: number;
  limit: number;
  hasMore: boolean;
  nextPage: number | null;
  total: number;
};
