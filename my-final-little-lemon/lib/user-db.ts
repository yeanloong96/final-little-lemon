import * as SQLite from 'expo-sqlite';

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneCallingCode: string;
  phoneNumber: string;
  avatarUri: string | null;
  notifyOrderStatuses: boolean;
  notifyPasswordChanges: boolean;
  notifySpecialOffers: boolean;
  notifyNewsletter: boolean;
};

const DB_NAME = 'little_lemon';
const TABLE = 'user';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

function intToBool(v: number | null | undefined): boolean {
  if (v === 0) return false;
  return true;
}

async function migrateUserTable(db: SQLite.SQLiteDatabase) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${TABLE});`);
  const names = new Set(cols.map((c) => c.name));
  const additions: [string, string][] = [
    ['avatarUri', 'TEXT'],
    ['notifyOrderStatuses', 'INTEGER NOT NULL DEFAULT 1'],
    ['notifyPasswordChanges', 'INTEGER NOT NULL DEFAULT 1'],
    ['notifySpecialOffers', 'INTEGER NOT NULL DEFAULT 1'],
    ['notifyNewsletter', 'INTEGER NOT NULL DEFAULT 1'],
  ];
  for (const [col, def] of additions) {
    if (!names.has(col)) {
      await db.execAsync(`ALTER TABLE ${TABLE} ADD COLUMN ${col} ${def};`);
    }
  }
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
        phoneNumber TEXT NOT NULL,
        avatarUri TEXT,
        notifyOrderStatuses INTEGER NOT NULL DEFAULT 1,
        notifyPasswordChanges INTEGER NOT NULL DEFAULT 1,
        notifySpecialOffers INTEGER NOT NULL DEFAULT 1,
        notifyNewsletter INTEGER NOT NULL DEFAULT 1
      );`
    );
    await migrateUserTable(db);
  })().catch((e) => {
    initPromise = null;
    throw e;
  });
  return initPromise;
}

type UserRow = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneCallingCode: string;
  phoneNumber: string;
  avatarUri: string | null;
  notifyOrderStatuses: number | null;
  notifyPasswordChanges: number | null;
  notifySpecialOffers: number | null;
  notifyNewsletter: number | null;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserRow>(`SELECT
      firstName, lastName, email, phoneCountryCode, phoneCallingCode, phoneNumber,
      avatarUri, notifyOrderStatuses, notifyPasswordChanges, notifySpecialOffers, notifyNewsletter
    FROM ${TABLE}
    WHERE id = 1;`);
  if (!row) return null;
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phoneCountryCode: row.phoneCountryCode,
    phoneCallingCode: row.phoneCallingCode,
    phoneNumber: row.phoneNumber,
    avatarUri: row.avatarUri ?? null,
    notifyOrderStatuses: intToBool(row.notifyOrderStatuses),
    notifyPasswordChanges: intToBool(row.notifyPasswordChanges),
    notifySpecialOffers: intToBool(row.notifySpecialOffers),
    notifyNewsletter: intToBool(row.notifyNewsletter),
  };
}

export async function saveUserProfile(profile: UserProfile) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE}
      (id, firstName, lastName, email, phoneCountryCode, phoneCallingCode, phoneNumber,
       avatarUri, notifyOrderStatuses, notifyPasswordChanges, notifySpecialOffers, notifyNewsletter)
     VALUES
      (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      profile.firstName,
      profile.lastName,
      profile.email,
      profile.phoneCountryCode,
      profile.phoneCallingCode,
      profile.phoneNumber,
      profile.avatarUri,
      profile.notifyOrderStatuses ? 1 : 0,
      profile.notifyPasswordChanges ? 1 : 0,
      profile.notifySpecialOffers ? 1 : 0,
      profile.notifyNewsletter ? 1 : 0,
    ]
  );
}

export async function clearUserTable() {
  const db = await getDb();
  await db.execAsync(`DELETE FROM ${TABLE};`);
}
