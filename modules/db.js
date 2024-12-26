import dbConfig from '@/db-config.js';
import { query, queryViaTabular } from '@modules/mssql-cmd.js';

const { useConfig, configs } = dbConfig;
const configName = useConfig;
const config = configs[configName];

const remote = {
  query: (sqlQuery) => query(sqlQuery, config.remote, 'json'),
  queryFile: (sqlQuery) => query(sqlQuery, config.remote, 'file'),
  queryString: (sqlQuery) => query(sqlQuery, config.remote, 'string'),
  queryViaTabular: (sqlQuery) => queryViaTabular(sqlQuery, config.remote, 'json'),
};

// NOTE: A singleton hack to circumvent the Next.js multiple calls to same
// module issue.
const pgpSym = Symbol.for('pgp-name');
let local = global[pgpSym];
if (!local) {
  const pgp = require('pg-promise')({ schema: config.local.schema });
  local = pgp(config.local);
  local.schema = config.local.schema;
  global[pgpSym] = local;
}

export { remote, local };
