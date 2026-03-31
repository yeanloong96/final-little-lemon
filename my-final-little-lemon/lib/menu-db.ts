import * as SQLite from 'expo-sqlite';

export type DbMenuItem = {
  id: string;
  title: string;
  description: string;
  price: string;
  imageFileName: string;
  category: string;
};

export type UpsertMenuItem = DbMenuItem;

const DB_NAME = 'little_lemon';
const TABLE = 'menu';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

export async function initMenuDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await getDb();
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price TEXT NOT NULL,
        imageFileName TEXT,
        category TEXT NOT NULL
      );`
    );
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_category ON ${TABLE}(category);`);
  })().catch((e) => {
    initPromise = null;
    throw e;
  });

  return initPromise;
}

export async function getMenuCount() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM ${TABLE};`);
  return row?.count ?? 0;
}

export async function getAllMenuItems() {
  const db = await getDb();
  return await db.getAllAsync<DbMenuItem>(`SELECT * FROM ${TABLE} ORDER BY title ASC;`);
}

export async function getMenuItemsFiltered(categories: string[], searchText: string) {
  const db = await getDb();

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (categories.length) {
    where.push(`category IN (${categories.map(() => '?').join(', ')})`);
    params.push(...categories);
  }

  const q = searchText.trim();
  if (q.length) {
    where.push(`title LIKE ? COLLATE NOCASE`);
    params.push(`%${q}%`);
  }

  const sql = `SELECT * FROM ${TABLE}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY title ASC;`;
  return await db.getAllAsync<DbMenuItem>(sql, params);
}

export async function saveMenuItems(items: UpsertMenuItem[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      `INSERT OR REPLACE INTO ${TABLE} (id, title, description, price, imageFileName, category)
       VALUES ($id, $title, $description, $price, $imageFileName, $category);`
    );
    try {
      for (const item of items) {
        await stmt.executeAsync({
          $id: item.id,
          $title: item.title,
          $description: item.description,
          $price: item.price,
          $imageFileName: item.imageFileName,
          $category: item.category,
        });
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
}

