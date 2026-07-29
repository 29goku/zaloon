"use server";

import { assignMembership as _assignMembership, cancelMembership as _cancelMembership } from "./memberships";

export async function assignMembership(...args: Parameters<typeof _assignMembership>) {
  return _assignMembership(...args);
}

export async function cancelMembership(...args: Parameters<typeof _cancelMembership>) {
  return _cancelMembership(...args);
}
