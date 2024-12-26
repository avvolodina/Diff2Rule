const dbConfig = {
  useConfig: 'production',
  configs: {
    production: {
      remote: {
        server: '.\\SQLEXPRESS',
        database: 'RACRAWL',
        schema: 'public',
        authMode: 'windows', //'login' or 'windows'
        user: 'my_mssql_user',
        password: 'my_mssql_password',
      },
      local: {
        host: 'localhost',
        port: 5432,
        database: 'diff2rule',
        schema: 'd2r-v1.0',
        user: 'postgres',
        password: 'abc',
      },
    },
    creator: {
      remote: {
        server: '.\\SQLEXPRESS',
        database: 'RACRAWL',
        schema: 'public',
        authMode: 'windows', //'login' or 'windows'
        user: 'my_mssql_user',
        password: 'my_mssql_password',
      },
      local: {
        host: 'localhost',
        port: 5432,
        database: 'diff2rule',
        schema: 'd2r-v1.0',
        user: 'postgres',
        password: 'abc',
      },
    },
  },
  mssql: {
    sqlcmdExecutable: 'sqlcmd.exe',
  },
};

export default dbConfig;
