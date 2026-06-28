import { readFileSync } from 'node:fs'

const projectRoot = process.cwd()
const current = JSON.parse(
  readFileSync(`${projectRoot}/packages/contracts/openapi/openapi.v1.json`, 'utf8'),
)
const reference = JSON.parse(
  readFileSync(`${projectRoot}/packages/contracts/openapi/reference/openapi.v1.json`, 'utf8'),
)

const forbiddenPatterns = [/firestore/i, /firebase uid/i, /firebaseuid/i]

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

function collectOperations(pathItem) {
  return Object.entries(pathItem).filter(([key]) =>
    ['get', 'put', 'post', 'patch', 'delete', 'options', 'head', 'trace'].includes(key),
  )
}

function compareObjectKeys(scope, referenceObject, currentObject) {
  for (const key of Object.keys(referenceObject)) {
    if (!(key in currentObject)) {
      fail(`Breaking change detected: removed ${scope}.${key}`)
    }
  }
}

function scanForbiddenTerms(node, path = 'root') {
  const serialized = JSON.stringify(node)

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(serialized)) {
      fail(`Forbidden term detected in OpenAPI document at ${path}: ${pattern}`)
    }
  }
}

function main() {
  scanForbiddenTerms(current)

  compareObjectKeys('paths', reference.paths, current.paths)

  for (const [pathName, referencePathItem] of Object.entries(reference.paths)) {
    const currentPathItem = current.paths[pathName]
    compareObjectKeys(`paths.${pathName}`, referencePathItem, currentPathItem)

    for (const [methodName, referenceOperation] of collectOperations(referencePathItem)) {
      const currentOperation = currentPathItem[methodName]
      compareObjectKeys(`paths.${pathName}.${methodName}.responses`, referenceOperation.responses, currentOperation.responses)
    }
  }

  compareObjectKeys(
    'components.schemas',
    reference.components.schemas,
    current.components.schemas,
  )
  compareObjectKeys(
    'components.parameters',
    reference.components.parameters,
    current.components.parameters,
  )
  compareObjectKeys(
    'components.securitySchemes',
    reference.components.securitySchemes,
    current.components.securitySchemes,
  )
}

main()
