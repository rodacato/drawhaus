const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres refuses a non-UUID bound to a UUID column; a fake that accepts it hides the bug. */
export function assertUuidColumn(value: string | null): void {
  if (value === null || UUID.test(value)) return;
  throw Object.assign(new Error(`invalid input syntax for type uuid: "${value}"`), {
    code: "22P02",
  });
}
