import { exec } from 'child_process';
import fs from 'fs';
import tmp from 'tmp';

// Directory where all temp files and dirs wil be created. Ensures maximum
// permissions for server processes.
const TEMP_DIR_ROOT = 'C:\\Users\\Public\\Temp';

/**
 * Executes a shell command and returns its output as a Promise.
 *
 * @param {string} command - The shell command to execute.
 * @returns {Promise<string>} - A Promise that resolves with the command's stdout.
 * @throws {Error} - If the command execution results in an error.
 */
export function cmdExec(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Generates a temporary filename with the specified options, overriding the
 * `tmpdir` option to be the TEMP_DIR_ROOT.
 *
 * @param {Object} options - Options to pass to tmp.tmpNameSync().
 * @returns {string} - The generated temporary filename.
 */
export function getTmpFilename(options = {}) {
  return tmp.tmpNameSync({ ...options, tmpdir: TEMP_DIR_ROOT });
}

/**
 * Creates a directory named 'Temp' in C:\Users\Public.
 *
 * @returns {string} - The path to the created directory.
 * @throws {Error} - If the directory creation fails.
 */
export function createTmpDirRoot() {
  if (!fs.existsSync(TEMP_DIR_ROOT)) {
    fs.mkdirSync(TEMP_DIR_ROOT);
  }
  return TEMP_DIR_ROOT;
}
