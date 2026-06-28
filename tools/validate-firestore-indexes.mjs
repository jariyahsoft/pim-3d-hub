import { readFileSync } from 'node:fs'

const expectedIndexes = [
  'capacity_slots|providerId:ASCENDING|startsAt:ASCENDING|status:ASCENDING',
  'file_assets|ownerId:ASCENDING|status:ASCENDING|createdAt:DESCENDING',
  'messages|conversationId:ASCENDING|createdAt:ASCENDING',
  'notifications|userId:ASCENDING|readAt:ASCENDING|createdAt:DESCENDING',
  'orders|buyerId:ASCENDING|status:ASCENDING|updatedAt:DESCENDING',
  'orders|providerId:ASCENDING|status:ASCENDING|updatedAt:DESCENDING',
  'posts|status:ASCENDING|visibility:ASCENDING|publishedAt:DESCENDING',
  'printers|providerId:ASCENDING|technologyCode:ASCENDING|status:ASCENDING',
  'products|categoryCode:ASCENDING|status:ASCENDING|createdAt:DESCENDING',
  'proposals|serviceRequestId:ASCENDING|status:ASCENDING|createdAt:DESCENDING',
  'provider_services|serviceType:ASCENDING|provinceCode:ASCENDING|instantOrderEnabled:ASCENDING|rating:DESCENDING',
  'service_requests|status:ASCENDING|serviceType:ASCENDING|provinceCode:ASCENDING|createdAt:DESCENDING',
]

const indexFile = JSON.parse(readFileSync('firebase/firestore.indexes.json', 'utf8'))

if (!Array.isArray(indexFile.indexes)) {
  throw new Error('firebase/firestore.indexes.json must contain an indexes array')
}

if (!Array.isArray(indexFile.fieldOverrides)) {
  throw new Error('firebase/firestore.indexes.json must contain a fieldOverrides array')
}

const actualIndexes = indexFile.indexes.map((index) => {
  if (index.queryScope !== 'COLLECTION') {
    throw new Error(`Unsupported queryScope for ${index.collectionGroup}: ${index.queryScope}`)
  }

  const fields = index.fields
    .map((field) => `${field.fieldPath}:${field.order ?? field.arrayConfig ?? 'UNKNOWN'}`)
    .join('|')

  return `${index.collectionGroup}|${fields}`
})

const missing = expectedIndexes.filter((index) => !actualIndexes.includes(index))
const unexpected = actualIndexes.filter((index) => !expectedIndexes.includes(index))

if (missing.length > 0 || unexpected.length > 0) {
  const details = [
    missing.length > 0 ? `Missing indexes: ${missing.join(', ')}` : '',
    unexpected.length > 0 ? `Unexpected indexes: ${unexpected.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  throw new Error(`Firestore index definition mismatch.\n${details}`)
}

console.log(`Validated ${actualIndexes.length} documented Firestore composite indexes`)
