/**
 * Module for executing SQL queries using Microsoft SQL Server's `sqlcmd`
 * utility. This module handles the creation of temporary SQL files, execution
 * of queries, and parsing of JSON output from `sqlcmd`.
 *
 * Note that this module is a simplistic substitute for the `mssql` package
 * which does not support Windows authentication. It also is a workaround for
 * the `msnodesqlv8` package which supports it but we had problems with webpack
 * vendor chunk paths.
 */


import { cmdExec, getTmpFilename } from '@modules/utils-server.js';
import fs from 'fs';
import dbConfig from '@/db-config.js';

const { mssql } = dbConfig;

/**
 * Executes a SQL query using `sqlcmd` and returns the result in the specified
 * mode.
 *
 * @param {string} sqlQuery - The SQL query to execute.
 * @param {Object} config - Configuration object containing SQL Server
 * connection details.
 * @param {string} config.authMode - Authentication mode ('login' or 'windows').
 * @param {string} config.server - SQL Server instance name.
 * @param {string} config.user - SQL Server username (if using 'login' auth
 * mode).
 * @param {string} config.password - SQL Server password (if using 'login' auth
 * mode).
 * @param {string} [mode='string'] - The mode in which to return the result
 * ('string', 'json', or 'file').
 * @returns {Promise<Object|string>} - A promise that resolves to the result of
 * the query.
 * @throws {Error} - Throws an error if the query execution fails or if the JSON
 * output cannot be parsed.
 */
export async function query(sqlQuery, config, mode = 'string') {
  // Request a properly formatted JSON array from the SQL query. ":XML ON" is a
  // directive that instructs to omit the column names in the output, and lifts
  // the output length restriction. "FOR JSON AUTO..." is added to the SELECT to
  // return the result as a JSON array.
  const modifiedSqlQuery = `:XML ON\n${sqlQuery}\nFOR JSON AUTO, INCLUDE_NULL_VALUES;`;
  const queryTmpFile = getTmpFilename({ postfix: '.sql' });
  const outputTmpFile = getTmpFilename({ postfix: '.json' });
  fs.writeFileSync(queryTmpFile, modifiedSqlQuery);

  let command = `"${mssql.sqlcmdExecutable}" -S "${config.server}" -i "${queryTmpFile}" -o "${outputTmpFile}"`;
  const authMode = config.authMode;
  if (authMode === 'login') {
    command += ` -U "${config.user}" -P "${config.password}"`;
  } else if (authMode === 'windows') {
    command += ` -E`;
  }

  await cmdExec(command);
  // console.log('outputTmpFile', outputTmpFile);

  // NOTE: "sqlcmd" bug workaround. It breaks JSON output into lines each 2033
  // characters. Here we're reading the output file and removing all line
  // breaks.
  let output = fs.readFileSync(outputTmpFile, 'utf8');
  output = output.replace(/[\n\r]/g, '');

  try {
    if (mode === 'file') {
      fs.writeFileSync(outputTmpFile, output);
      return outputTmpFile;
    } else if (mode === 'string') {
      return output;
    } else {
      return JSON.parse(output);
    }
  } catch (error) {
    throw new Error(`Error outputting result: ${error.message}`);
  } finally {
    fs.unlink(queryTmpFile, (unlinkErr) => {
      if (unlinkErr) {
        console.error(`Failed to remove temporary file: ${unlinkErr.message}`);
      }
    });

    if (mode !== 'file') {
      fs.unlink(outputTmpFile, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Failed to remove temporary file: ${unlinkErr.message}`);
        }
      });
    }
  }
}

/**
 * Executes a SQL query using `sqlcmd` relying on its standard "tabular" output
 * format, and parses that output into JSON. This function supports the same
 * three modes as the `query` function.
 *
 * @param {string} sqlQuery - The SQL query to execute.
 * @param {Object} config - Configuration object containing SQL Server
 * connection details.
 * @param {string} config.server - SQL Server instance name.
 * @param {string} config.database - SQL Server database name.
 * @param {string} [mode='string'] - The mode in which to return the result
 * ('string', 'json', or 'file').
 * @returns {Promise<Object|string>} - A promise that resolves to the result of
 * the query.
 * @throws {Error} - Throws an error if the query execution fails or if the JSON
 * output cannot be parsed.
 */
export function queryViaTabular(sqlQuery, config, mode = 'string') {
  const queryTmpFile = getTmpFilename({ postfix: '.sql' });
  const outputTmpFile = getTmpFilename({ postfix: '.txt' });
  fs.writeFileSync(queryTmpFile, sqlQuery);

  let command = `"${mssql.sqlcmdExecutable}" -E -S "${config.server}" -d "${config.database}" -i "${queryTmpFile}" -o "${outputTmpFile}" -W -s ;`;

  return cmdExec(command)
    .then(() => {
      const stdOutput = fs.readFileSync(outputTmpFile, 'utf8');
      const parsedOutput = parseTabular(stdOutput);

      if(mode === 'file') {
        const resultTmpFile = getTmpFilename({ postfix: '.json' });
        fs.writeFileSync(resultTmpFile, JSON.stringify(parsedOutput));
        return resultTmpFile;
      } else if (mode === 'string') {
        return JSON.stringify(parsedOutput);
      } else {
        return parsedOutput;
      }
    })
    .finally(() => {
      fs.unlink(queryTmpFile, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Failed to remove temporary file: ${unlinkErr.message}`);
        }
      });
      fs.unlink(outputTmpFile, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Failed to remove temporary file: ${unlinkErr.message}`);
        }
      });
    });
}

/**
 * Parses the standard "tabular" output from `sqlcmd` into a JSON object.
 *
 * @param {string} stdOutput - The output from `sqlcmd` as a string.
 * @returns {Object[]} - An array of objects representing the parsed rows.
 */
function parseTabular(stdOutput) {
  const lines = stdOutput.split('\n');
  const headers = lines[0].split(';').map((header) => header.trim());
  // Remove empty lines, and the first two lines (the headers and the
  // separator), and the last line (the row count)
  const rows = lines.filter((line) => line.trim() !== '').slice(2, -1);

  return rows.map((row) => {
    const values = row.split(';').map((value) => value.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {});
  });
}
