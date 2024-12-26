'use server';
import { local } from '@modules/db.js';
import { unstable_cacheTag as cacheTag, revalidateTag } from 'next/cache';

export async function ruleSetFetchAll() {
  revalidateTag('RuleSetSelect');

  try {
    const sqlQuery = `
      SELECT *
      FROM rule_set
      ORDER BY name
    `;
    const result = await local.query(sqlQuery);
    return result;
  } catch(error) {
    error.message = `[ruleSetFetchAll] ${error.message}`;
    console.error(error);
    throw error;
  }
}

export async function ruleSetFetchAllSelect() {
  // eslint-disable-next-line
  'use cache';
  cacheTag('RuleSetSelect');

  try {
    const sqlQuery = `
      SELECT id, name, params
      FROM rule_set
      WHERE coalesce(name, '') <> ''
        AND coalesce(handler, '') <> ''
        AND coalesce(params, '[]') <> '[]'
        AND coalesce(visualizer, '') <> ''
    `;

    const result = await local.query(sqlQuery);
    return result;
  } catch(error) {
    error.message = `[ruleSetFetchAllSelect] ${error.message}`;
    console.error(error);
    throw error;
  }
}

export async function ruleSetCreate(values) {
  revalidateTag('RuleSetSelect');

  try {
    const sqlQuery = `
      INSERT INTO rule_set (
        name,
        handler,
        params,
        visualizer,
        descr
      ) VALUES (
        $[name],
        $[handler],
        $[params:json],
        $[visualizer],
        $[descr]
      )
      RETURNING id
    `;

    const result = await local.query(sqlQuery, values);
    return result[0].id;
  } catch(error) {
    error.message = `[ruleSetCreate] ${error.message}`;
    console.error(error);
    throw error;
  }
}

export async function ruleSetUpdate(values) {
  revalidateTag('RuleSetSelect');

  try {
    const sqlQuery = `
      UPDATE rule_set
      SET name = $[name],
          handler = $[handler],
          params = $[params:json],
          visualizer = $[visualizer],
          descr = $[descr]
      WHERE id = $[id]
    `;
    await local.none(sqlQuery, values);
  } catch(error) {
    error.message = `[ruleSetUpdate] ${error.message}`;
    console.error(error);
    throw error;
  }
}

export async function ruleSetDelete(id) {
  revalidateTag('RuleSetSelect');

  try {
    const sqlQuery = `
      DELETE FROM rule_set
      WHERE id = $[id]
    `;
    await local.none(sqlQuery, { id });
  } catch(error) {
    error.message = `[ruleSetDelete] ${error.message}`;
    console.error(error);
    throw error;
  }
}
