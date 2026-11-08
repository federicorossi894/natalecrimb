// Server-only (blocked from client bundles by the *.server.* rule). Owner-supplied salted PBKDF2 verifier
// of the shared volunteer password; the clear password is never stored. VOLUNTEER_PASSWORD_HASH overrides it.
const OWNER_VERIFIER = 'pbkdf2_sha256$310000$SnWqdgflC4XjJhKelpuXlh38kVORCM6p$vxvFvFyGdexL_0_BZXyGxpSAWkjw6o613bPi6sHpfMA';

export function volunteerVerifier(): string {
  const env = process.env['VOLUNTEER_PASSWORD_HASH'];
  return env && env.startsWith('pbkdf2_sha256$') ? env : OWNER_VERIFIER;
}
