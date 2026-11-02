export class HttpError extends Error {
  constructor(status, message, code, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}
