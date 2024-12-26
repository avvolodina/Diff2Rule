import { checkGetFieldList, checkGetSnapshotRecset } from '../utils';
import {
  getRecsetDiffList,
  getRecsetDiffTable,
  doGenericResultRenamesList,
  doGenericResultRenamesTable,
} from './diff-common';

/**
 * Executes a comparison between two snapshots, identifying discrepancies based
 * on key fields. The algorithm iterates through each row of the new snapshot,
 * attempting to find a match in the old snapshot based on the provided key
 * fields. Discrepancies are categorized as 'new_key_no_match' (new row not
 * found in old), 'old_key_no_match' (old row not found in new), and
 * 'field_discrepancy' (mismatched other field values). Field discrepancies for
 * each row are reported as a list of fields with mismatched values.
 * @param {object} params - The parameters for the comparison.
 * @param {string} params.ssIdOld - The ID of the old snapshot.
 * @param {string} params.ssIdNew - The ID of the new snapshot.
 * @param {string} params.keyFieldList - A comma or space separated string of
 * key fields used for comparison.
 * @returns {object} An object containing the comparison results, a message, and
 * statistics.
 */
export async function diffSsAsList(params) {
  const keyFields = checkGetFieldList(params, 'keyFieldList');
  const ssOld = await checkGetSnapshotRecset(params, 'ssIdOld');
  const ssNew = await checkGetSnapshotRecset(params, 'ssIdNew');

  const result = getRecsetDiffList(ssOld, ssNew, keyFields, ['snapshot_id']);

  doGenericResultRenamesList(result);
  return result;
}

/**
 * Executes a comparison between two snapshots, identifying discrepancies based
 * on key fields, returning a table format. Table columns coincide with the
 * fields in the source snapshots. Cells with discrepancies receive objects of
 * the form { old: valueA, new: valueB }. Identical cells receive null values.
 * Unmatched old or new rows receive all cells with respective "old" or "new"
 * properties set to original unmatched row cell values, while their new/old
 * counterparts are set to null.
 * @param {object} params - The parameters for the comparison.
 * @param {string} params.ssIdOld - The ID of the old snapshot.
 * @param {string} params.ssIdNew - The ID of the new snapshot.
 * @param {string} params.keyFieldList - A comma or space separated string of
 * key fields used for comparison.
 * @returns {object} An object containing the comparison results, a message, and
 * statistics.
 */
export async function diffSsAsTable(params) {
  const keyFields = checkGetFieldList(params, 'keyFieldList');
  const ssOld = await checkGetSnapshotRecset(params, 'ssIdOld');
  const ssNew = await checkGetSnapshotRecset(params, 'ssIdNew');

  const result = getRecsetDiffTable(ssOld, ssNew, keyFields, ['snapshot_id']);

  doGenericResultRenamesTable(result);
  return result;
}
