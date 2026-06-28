import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { Client as PostgresClient } from 'pg'
import { MongoClient } from 'mongodb'

const fixturePath = new URL('../tests/fixtures/portability/provider_profiles.jsonl', import.meta.url)
const fixtureContents = readFileSync(fixturePath, 'utf8').trim()
function normalizeCanonicalRecord(record) {
  return {
    createdAt: record.createdAt,
    createdBy: record.createdBy ?? null,
    deletedAt: record.deletedAt ?? null,
    id: record.id,
    ownerUserId: record.ownerUserId,
    publicName: record.publicName,
    schemaVersion: record.schemaVersion,
    status: record.status,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy ?? null,
    version: record.version,
  }
}

const fixtureRecords = fixtureContents
  .split('\n')
  .filter((line) => line.trim().length > 0)
  .map((line) => normalizeCanonicalRecord(JSON.parse(line)))
  .sort((left, right) => left.id.localeCompare(right.id))

const suffix = `${process.pid}`
const postgresContainerName = `pim-portability-postgres-${suffix}`
const mongoContainerName = `pim-portability-mongo-${suffix}`
const postgresPort = 55432
const mongoPort = 57017
const postgresConnectionString = `postgresql://postgres:postgres@127.0.0.1:${postgresPort}/pim_portability`
const mongoConnectionString = `mongodb://127.0.0.1:${mongoPort}`

function runDocker(args) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.status === 0) {
    return result
  }

  const stderr = result.stderr.trim()
  throw new Error(stderr.length > 0 ? stderr : `docker ${args.join(' ')} failed`)
}

function stopContainer(name) {
  spawnSync('docker', ['rm', '--force', '--volumes', name], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function waitForPostgres(connectionString) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const client = new PostgresClient({ connectionString })

    try {
      await client.connect()
      await client.query('select 1')
      await client.end()
      return
    } catch {
      await client.end().catch(() => {})
      await delay(1000)
    }
  }

  throw new Error('PostgreSQL container did not become ready in time')
}

async function waitForMongo(connectionString) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const client = new MongoClient(connectionString, { serverSelectionTimeoutMS: 1000 })

    try {
      await client.connect()
      await client.db('admin').command({ ping: 1 })
      await client.close()
      return
    } catch {
      await client.close().catch(() => {})
      await delay(1000)
    }
  }

  throw new Error('MongoDB container did not become ready in time')
}

function normalizeTimestamp(value) {
  if (value === null) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return new Date(value).toISOString()
}

function normalizePostgresRecord(record) {
  return {
    createdAt: normalizeTimestamp(record.createdAt),
    createdBy: record.createdBy,
    deletedAt: normalizeTimestamp(record.deletedAt),
    id: record.id,
    ownerUserId: record.ownerUserId,
    publicName: record.publicName,
    schemaVersion: record.schemaVersion,
    status: record.status,
    updatedAt: normalizeTimestamp(record.updatedAt),
    updatedBy: record.updatedBy,
    version: record.version,
  }
}

function normalizeMongoRecord(record) {
  return {
    createdAt: normalizeTimestamp(record.createdAt),
    createdBy: record.createdBy ?? null,
    deletedAt: normalizeTimestamp(record.deletedAt),
    id: record.id,
    ownerUserId: record.ownerUserId,
    publicName: record.publicName,
    schemaVersion: record.schemaVersion,
    status: record.status,
    updatedAt: normalizeTimestamp(record.updatedAt),
    updatedBy: record.updatedBy ?? null,
    version: record.version,
  }
}

function findMismatches(expectedRecords, actualRecords, label) {
  const mismatches = []

  if (expectedRecords.length !== actualRecords.length) {
    mismatches.push(
      `${label}: expected ${expectedRecords.length} records, received ${actualRecords.length}`,
    )
  }

  for (let index = 0; index < expectedRecords.length; index += 1) {
    const expected = expectedRecords[index]
    const actual = actualRecords[index]

    if (!actual) {
      mismatches.push(`${label}: missing record at index ${index}`)
      continue
    }

    const expectedText = JSON.stringify(normalizeCanonicalRecord(expected))
    const actualText = JSON.stringify(normalizeCanonicalRecord(actual))

    if (expectedText !== actualText) {
      mismatches.push(`${label}: record ${expected.id} mismatch`)
    }
  }

  return mismatches
}

async function run() {
  stopContainer(postgresContainerName)
  stopContainer(mongoContainerName)

  runDocker([
    'run',
    '--detach',
    '--rm',
    '--name',
    postgresContainerName,
    '--publish',
    `${postgresPort}:5432`,
    '--env',
    'POSTGRES_DB=pim_portability',
    '--env',
    'POSTGRES_USER=postgres',
    '--env',
    'POSTGRES_PASSWORD=postgres',
    'postgres:16-alpine',
  ])
  runDocker([
    'run',
    '--detach',
    '--rm',
    '--name',
    mongoContainerName,
    '--publish',
    `${mongoPort}:27017`,
    'mongo:7',
  ])

  await Promise.all([
    waitForPostgres(postgresConnectionString),
    waitForMongo(mongoConnectionString),
  ])

  const postgresClient = new PostgresClient({ connectionString: postgresConnectionString })
  const mongoClient = new MongoClient(mongoConnectionString)

  try {
    await postgresClient.connect()
    await postgresClient.query(`
      create table if not exists provider_profiles (
        id text primary key,
        owner_user_id text not null,
        public_name text not null,
        status text not null,
        created_at timestamptz not null,
        created_by text null,
        updated_at timestamptz not null,
        updated_by text null,
        deleted_at timestamptz null,
        schema_version integer not null,
        version integer not null
      )
    `)
    await postgresClient.query('truncate table provider_profiles')

    for (const record of fixtureRecords) {
      await postgresClient.query(
        `
          insert into provider_profiles (
            id,
            owner_user_id,
            public_name,
            status,
            created_at,
            created_by,
            updated_at,
            updated_by,
            deleted_at,
            schema_version,
            version
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          record.id,
          record.ownerUserId,
          record.publicName,
          record.status,
          new Date(record.createdAt),
          record.createdBy,
          new Date(record.updatedAt),
          record.updatedBy,
          record.deletedAt ? new Date(record.deletedAt) : null,
          record.schemaVersion,
          record.version,
        ],
      )
    }

    const postgresRows = (
      await postgresClient.query(`
        select
          id,
          owner_user_id as "ownerUserId",
          public_name as "publicName",
          status,
          created_at as "createdAt",
          created_by as "createdBy",
          updated_at as "updatedAt",
          updated_by as "updatedBy",
          deleted_at as "deletedAt",
          schema_version as "schemaVersion",
          version
        from provider_profiles
        order by id asc
      `)
    ).rows.map(normalizePostgresRecord)

    await mongoClient.connect()
    const collection = mongoClient.db('pim_portability').collection('provider_profiles')
    await collection.deleteMany({})
    await collection.insertMany(
      fixtureRecords.map((record) => ({
        ...record,
        createdAt: new Date(record.createdAt),
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        updatedAt: new Date(record.updatedAt),
      })),
    )

    const mongoRows = (
      await collection.find({}, { sort: { id: 1 } }).toArray()
    ).map(({ _id, ...record }) => normalizeMongoRecord(record))

    const postgresMismatches = findMismatches(fixtureRecords, postgresRows, 'postgres')
    const mongoMismatches = findMismatches(fixtureRecords, mongoRows, 'mongo')
    const mismatches = [...postgresMismatches, ...mongoMismatches]

    if (mismatches.length > 0) {
      throw new Error(mismatches.join('; '))
    }

    console.log('Portability rehearsal passed')
    console.log(`Records: ${fixtureRecords.length}`)
    console.log('References checked: ownerUserId')
    console.log('Money fields: not applicable for provider_profiles representative entity')
    console.log('PostgreSQL and MongoDB imports matched the canonical JSONL sample')
  } finally {
    await postgresClient.end().catch(() => {})
    await mongoClient.close().catch(() => {})
    stopContainer(postgresContainerName)
    stopContainer(mongoContainerName)
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
