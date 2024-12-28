export function crawl({ tArg }) {
  const whereClause = !!tArg ? `WHERE Timestamp <= '${tArg}'` : '';

  return `
    SELECT *
    FROM Crawl
    ${whereClause}
  `;
}
