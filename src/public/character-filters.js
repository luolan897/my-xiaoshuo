function characterRaceId(character) {
  return String(character?.race?.id ?? character?.raceId ?? "");
}

function characterOrganizationIds(character) {
  return (Array.isArray(character?.organizations) ? character.organizations : [])
    .map((organization) => String(organization?.id ?? ""))
    .filter(Boolean);
}

export function filterCharacters(characters, { raceIds = [], organizationIds = [] } = {}) {
  const selectedRaceIds = new Set(raceIds.map(String).filter(Boolean));
  const selectedOrganizationIds = new Set(organizationIds.map(String).filter(Boolean));
  return characters.filter((character) => {
    const matchesRace = selectedRaceIds.size === 0 || selectedRaceIds.has(characterRaceId(character));
    const matchesOrganization = selectedOrganizationIds.size === 0
      || characterOrganizationIds(character).some((organizationId) => selectedOrganizationIds.has(organizationId));
    return matchesRace && matchesOrganization;
  });
}

export function paginateCharacters(characters, page, limit) {
  const safeLimit = Math.max(1, Number(limit) || 1);
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safeLimit;
  const items = characters.slice(start, start + safeLimit);
  return {
    items,
    page: safePage,
    limit: safeLimit,
    hasMore: start + safeLimit < characters.length,
    nextPage: start + safeLimit < characters.length ? safePage + 1 : null,
    total: characters.length
  };
}
