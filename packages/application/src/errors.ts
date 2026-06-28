export class InvalidRequestError extends Error {
  readonly code = 'INVALID_REQUEST'
  readonly status = 400

  constructor(message: string) {
    super(message)
    this.name = 'InvalidRequestError'
  }
}

export class AuthorizationDeniedError extends Error {
  readonly code = 'AUTHORIZATION_DENIED'
  readonly status = 403

  constructor(message = 'Not authorized to perform this action') {
    super(message)
    this.name = 'AuthorizationDeniedError'
  }
}
