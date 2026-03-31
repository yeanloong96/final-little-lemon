import * as SQLite from 'expo-sqlite';

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string; // e.g. "MY"
  phoneCallingCode: string; // e.g. "60"
  phoneNumber: string;
};

const DB_NAME = 'little_lemon';
const TABLE = 'user';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

export async function initUserDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = await getDb();
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (
        id INTEGER PRIMARY KEY NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL,
        phoneCountryCode TEXT NOT NULL,
        phoneCallingCode TEXT NOT NULL,
        phoneNumber TEXT NOT NULL
      );`
    );
  })().catch((e) => {
    initPromise = null;
    throw e;
  });
  return initPromise;
}

export async function getUserProfile() {
  const db = await getDb();
  const row = await db.getFirstAsync<UserProfile>(`SELECT
      firstName, lastName, email, phoneCountryCode, phoneCallingCode, phoneNumber
    FROM ${TABLE}
    WHERE id = 1;`);
  return row ?? null;
}

export async function saveUserProfile(profile: UserProfile) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE}
      (id, firstName, lastName, email, phoneCountryCode, phoneCallingCode, phoneNumber)
     VALUES
      (1, ?, ?, ?, ?, ?, ?);`,
    [
      profile.firstName,
      profile.lastName,
      profile.email,
      profile.phoneCountryCode,
      profile.phoneCallingCode,
      profile.phoneNumber,
    ]
  );
}

export async function clearUserTable() {
  const db = await getDb();
  await db.execAsync(`DELETE FROM ${TABLE};`);
}

