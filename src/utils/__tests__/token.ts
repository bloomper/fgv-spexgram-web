/**
 * An unsigned JWT carrying the given fgv-spexgram client roles; the web only decodes tokens.
 */
export function tokenWithRoles(roles: string[]): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "none" })}.${encode({ resource_access: { "fgv-spexgram": { roles } } })}.`;
}
