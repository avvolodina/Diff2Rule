'use server';
import { unstable_cacheTag as cacheTag, revalidateTag } from 'next/cache';
import { local } from '@modules/db.js';

export async function targetQueryFetchAll() {
  revalidateTag('TargetQuerySelect');

  try {
    const sqlQuery = `
      SELECT *
      FROM target_query
      ORDER BY name
    `;
    const result = await local.query(sqlQuery);
    return result;
  } catch(error) {
    error.message = `[targetQueryFetchAll] ${error.message}`;
    console.error(error);
    throw error;
  }
}

export async function targetQueryFetchAllSelect() {
  // eslint-disable-next-line
  'use cache';
  cacheTag('TargetQuerySelect');

  try {
    const sqlQuery = `
      SELECT id, name
      FROM target_query
      ORDER BY name
    `;
    const result = await local.query(sqlQuery);
    return result;
  } catch(error) {
    error.message = `[targetQueryFetchAllSelect] ${error.message}`;
    console.error(error);
    throw error;
  }
}

export async function targetQueryCreate(values) {
  revalidateTag('TargetQuerySelect');

  try {
    const sqlQuery = `
      INSERT INTO target_query (
        name
        ,handler
        ,snapshot_table
        ,notes
      ) VALUES (
        $[name]
        ,$[handler]
        ,$[snapshot_table]
        ,$[notes]
      )
      RETURNING id
    `;

    const result = await local.query(sqlQuery, values);
    return result[0].id;
  } catch(error) {
    error.message = `[targetQueryCreate] ${error.message}`;
    console.error(error);
    throw error;
  }
}

export async function targetQueryUpdate(values) {
  revalidateTag('TargetQuerySelect');

  try {
    const sqlQuery = `
      UPDATE target_query
      SET name = $[name]
        ,handler = $[handler]
        ,snapshot_table = $[snapshot_table]
        ,notes = $[notes]
      WHERE id = $[id]
    `;

    await local.none(sqlQuery, values);
  } catch(error) {
    error.message = `[targetQueryUpdate] ${error.message}`;
    console.error(error);
    throw error;
  }
}

export async function targetQueryDelete(id) {
  revalidateTag('TargetQuerySelect');

  try {
    const sqlQuery = `
      DELETE FROM target_query
      WHERE id = $[id]
    `;
    local.none(sqlQuery, { id });
  } catch(error) {
    error.message = `[targetQueryDelete] ${error.message}`;
    console.error(error);
    throw error;
  }
}
