/**
 * Compares two record sets (arrays of shallow objects of the same structure)
 * based on specified key fields and optional excluded fields.
 *
 * Discrepancy types:
 * - `key_b_no_match`: A record in `recsetB` does not have a match in `recsetA`
 *   based on the key fields.
 * - `key_a_no_match`: A record in `recsetA` does not have a match in `recsetB`
 *   based on the key fields.
 * - `field_discrepancy`: A record exists in both `recsetA` and `recsetB` with
 *   matching key fields, but one or more non-key fields have different values.
 *
 * The result object has the following structure:
 * {
 *   stats: {
 *     total: number, // Total number of discrepancies found
 *     keyBNoMatch: number, // Number of records in recsetB that have no match in recsetA
 *     keyANoMatch: number, // Number of records in recsetA that have no match in recsetB
 *     fieldsDiscrepancies: number, // Number of records with field discrepancies
 *   },
 *   compare: Array<object>, // Array of discrepancy objects
 *   message: string, // A message briefly describing the discrepancies found
 * }
 *
 * @param {Array<object>} recsetA - The first record set.
 * @param {Array<object>} recsetB - The second record set.
 * @param {Array<string>} keyFields - An array of key fields used for
 * comparison.
 * @param {Array<string>} [excludeFields] - An optional array of fields to
 * exclude from the comparison.
 * @returns {object} An object containing the comparison results, a message, and
 * statistics.
 */
export function getRecsetDiffList(recsetA, recsetB, keyFields, excludeFields = []) {
  const compare = [];
  const recsetACopy = [...recsetA];

  // MAIN LOOP: Iterate over each row in recordset B
  for (const rowB of recsetB || []) {
    // Create a key object based on the key fields
    const key = createKeyObj(rowB, keyFields);

    // Find the index of a matching row in recordset A based on key fields
    const rowIdxA = recsetACopy.findIndex((rowA) => !isKeysetDifferent(keyFields, rowA, rowB));

    // If no matching row is found in recordset A
    if (rowIdxA === -1) {
      compare.push({ type: 'key_b_no_match', key });
      continue;
    }

    // -- If a matching row is found

    const rowA = recsetACopy[rowIdxA];
    // Object to store field discrepancies
    const fields = {};
    // Flag to track if any discrepancy is found
    let hasDiscrepancy = false;

    // Compare each non-key field in row B with the corresponding field in row A
    for (const field in rowB) {
      if (isComparisonField(field, keyFields, excludeFields)) {
        const valueB = rowB[field];
        const valueA = rowA[field];

        if (isDifferent(valueA, valueB)) {
          fields[field] = { valueA, valueB };
          hasDiscrepancy = true;
        }
      }
    }

    // If any discrepancy is found in the fields
    if (hasDiscrepancy) {
      compare.push({ type: 'field_discrepancy', key, fields });
    }

    // Remove the matched A row
    recsetACopy.splice(rowIdxA, 1);
  } // for rowB

  // Add all remaining A rows as no-match discrepancies
  for (const rowA of recsetACopy || []) {
    const key = createKeyObj(rowA, keyFields);
    compare.push({ type: 'key_a_no_match', key });
  }

  // STATS
  const keyBNoMatch = compare.filter((item) => item.type === 'key_b_no_match').length;
  const keyANoMatch = compare.filter((item) => item.type === 'key_a_no_match').length;
  const fieldsDiscrepancies = compare.filter((item) => item.type === 'field_discrepancy').length;
  const total = keyBNoMatch + keyANoMatch + fieldsDiscrepancies;

  let message = 'No discrepancies found';
  if (total > 0) {
    const messages = [];
    if (keyBNoMatch > 0 || keyANoMatch > 0) {
      messages.push('Unmatched keys found');
    }
    if (fieldsDiscrepancies > 0) {
      messages.push('Field discrepancies found');
    }
    message = messages.join('. ');
  }
  message += '.';

  const fields = {
    key: keyFields,
    comp: getComparisonFields(recsetA?.[0] || recsetB?.[0] || {}, keyFields, excludeFields),
  };

  return {
    stats: {
      total,
      keyBNoMatch,
      keyANoMatch,
      fieldsDiscrepancies,
    },
    compare,
    message,
    fields,
  };
}

/**
 * Compares two record sets (arrays of shallow objects of the same structure)
 * based on specified key fields and optional excluded fields, returning a
 * table format.
 *
 * All discrepancy table cells receive objects of the form { a: valueA, b:
 * valueB }. Identical cells receive null values. Unmatched A or B rows receive
 * all cells with "b" or "a" properties, respectively, set to null.
 *
 * The result object has the following structure:
 * {
 *   stats: {
 *     total: number, // Total number of discrepancies found
 *     keyBNoMatch: number, // Number of records in recsetB that have no match in recsetA
 *     keyANoMatch: number, // Number of records in recsetA that have no match in recsetB
 *     fieldsDiscrepancies: number, // Number of records with field discrepancies
 *   },
 *   table: Array<object>, // Array of table row objects
 *   message: string, // A message briefly describing the discrepancies found
 * }
 *
 * @param {Array<object>} recsetA - The first record set.
 * @param {Array<object>} recsetB - The second record set.
 * @param {Array<string>} keyFields - An array of key fields used for
 * comparison.
 * @param {Array<string>} [excludeFields] - An optional array of fields to
 * exclude from the comparison.
 * @returns {object} An object containing the comparison results, a message, and
 * statistics.
 */
export function getRecsetDiffTable(recsetA, recsetB, keyFields, excludeFields = []) {
  const table = [];
  const recsetACopy = [...recsetA];

  let keyBNoMatch = 0;
  let keyANoMatch = 0;
  let fieldsDiscrepancies = 0;

  for (const rowB of recsetB) {
    const rowIdxA = recsetACopy.findIndex((rowA) => !isKeysetDifferent(keyFields, rowA, rowB));
    const key = createKeyObj(rowB, keyFields);
    const fields = {};

    // Has row in recsetB, no matching row in recsetA
    if (rowIdxA === -1) {
      for (const field in rowB) {
        if (isComparisonField(field, keyFields, excludeFields)) {
          fields[field] = { a: null, b: rowB[field] };
        }
      }

      table.push({ type: 'key_b_no_match', key, fields });
      keyBNoMatch++;
      continue;
    }

    // -- If a matching row is found

    const rowA = recsetACopy[rowIdxA];
    let hasDiscrepancy = false;

    for (const field in rowB) {
      if (isComparisonField(field, keyFields, excludeFields)) {
        const valueB = rowB[field];
        const valueA = rowA[field];

        if (isDifferent(valueA, valueB)) {
          fields[field] = { a: valueA, b: valueB };
          hasDiscrepancy = true;
        } else {
          fields[field] = null;
        }
      }
    }

    if (hasDiscrepancy) {
      table.push({ type: 'field_discrepancy', key, fields });
      fieldsDiscrepancies++;
    } else {
      table.push({ type: 'full_match', key, fields });
    }

    recsetACopy.splice(rowIdxA, 1);
  }

  // Add all remaining A rows to the table too
  for (const rowA of recsetACopy) {
    const key = createKeyObj(rowA, keyFields);
    const fields = {};
    for (const field in rowA) {
      if (isComparisonField(field, keyFields, excludeFields)) {
        fields[field] = { a: rowA[field], b: null };
      }
    }

    table.push({ type: 'key_a_no_match', key, fields });
    keyANoMatch++;
  }

  const total = keyBNoMatch + keyANoMatch + fieldsDiscrepancies;

  let message = 'No discrepancies found';
  if (total > 0) {
    const messages = [];
    if (keyBNoMatch > 0 || keyANoMatch > 0) {
      messages.push('Unmatched keys found');
    }
    if (fieldsDiscrepancies > 0) {
      messages.push('Field discrepancies found');
    }
    message = messages.join('. ');
  }
  message += '.';

  const fields = {
    key: keyFields,
    comp: getComparisonFields(recsetA?.[0] || recsetB?.[0] || {}, keyFields, excludeFields),
  };

  return {
    stats: {
      total,
      keyBNoMatch,
      keyANoMatch,
      fieldsDiscrepancies,
    },
    table,
    message,
    fields,
  };
}

/**
 * Checks if two values are different, handling Date objects.
 *
 * @param {*} valueA - The first value to compare.
 * @param {*} valueB - The second value to compare.
 * @returns {boolean} - True if the values are different, false otherwise.
 */
function isDifferent(valueA, valueB) {
  if (valueA instanceof Date && valueB instanceof Date) {
    return valueA.getTime() !== valueB.getTime();
  }
  return valueA !== valueB;
}

/**
 * Checks if the key fields of two objects are different.
 *
 * @param {Array<string>} keyFields - An array of key fields to compare.
 * @param {object} rowA - The first object to compare.
 * @param {object} rowB - The second object to compare.
 * @returns {boolean} - True if the key fields are different, false otherwise.
 */
function isKeysetDifferent(keyFields, rowA, rowB) {
  return !keyFields.every((field) => !isDifferent(rowA[field], rowB[field]));
}

/**
 * Gets a sorted array of comparison fields from a row.
 *
 * @param {object} row - The row to get the comparison fields from.
 * @param {Array<string>} keyFields - An array of key fields.
 * @param {Array<string>} [excludeFields] - An optional array of fields to exclude.
 * @returns {Array<string>} - A sorted array of comparison fields.
 */
function getComparisonFields(row, keyFields, excludeFields) {
  const fields = [];
  for (const field in row) {
    if (isComparisonField(field, keyFields, excludeFields)) {
      fields.push(field);
    }
  }
  return fields.sort();
}

/**
 * Checks if a field should be included in the comparison.
 *
 * @param {string} field - The field to check.
 * @param {Array<string>} keyFields - An array of key fields.
 * @param {Array<string>} [excludeFields] - An optional array of fields to
 * exclude.
 * @returns {boolean} - True if the field should be included in the comparison,
 * false otherwise.
 */
function isComparisonField(field, keyFields, excludeFields) {
  return !keyFields.includes(field) && (!excludeFields || !excludeFields.includes(field));
}

/**
 * Creates a key object based on the key fields of a row.
 *
 * @param {object} row - The row to create the key object from.
 * @param {Array<string>} keyFields - An array of key fields.
 * @returns {object} - The key object.
 */
function createKeyObj(row, keyFields) {
  return keyFields.reduce((obj, field) => {
    obj[field] = row[field];
    return obj;
  }, {});
}

// Map: discrepancy types generic a/b -> old/new
const discrepTypeMap = {
  key_b_no_match: 'new_key_no_match',
  key_a_no_match: 'old_key_no_match',
  field_discrepancy: 'field_discrepancy',
  full_match: 'full_match',
};

/**
 * Performs handler-specific renames on the result object for list format diffs.
 * @param {object} result - The result object to modify.
 */
export function doGenericResultRenamesList(result) {
  result.compare.forEach((discrep) => {
    discrep.type = discrepTypeMap[discrep.type];
  });

  result.stats.newKeyNoMatch = result.stats.keyBNoMatch;
  delete result.stats.keyBNoMatch;
  result.stats.oldKeyNoMatch = result.stats.keyANoMatch;
  delete result.stats.keyANoMatch;
}

/**
 * Performs handler-specific renames on the result object for table format diffs.
 * @param {object} result - The result object to modify.
 */
export function doGenericResultRenamesTable(result) {
  result.stats.newKeyNoMatch = result.stats.keyBNoMatch;
  delete result.stats.keyBNoMatch;
  result.stats.oldKeyNoMatch = result.stats.keyANoMatch;
  delete result.stats.keyANoMatch;

  result.table.forEach((row) => {
    // Discrepancy type -> old/new
    row.type = discrepTypeMap[row.type];

    // a/b properties -> old/new
    for (const field in row.fields) {
      const cell = row.fields[field];
      if (!cell) continue;

      cell.old = cell.a;
      delete cell.a;
      cell.new = cell.b;
      delete cell.b;
    }
  });
}
