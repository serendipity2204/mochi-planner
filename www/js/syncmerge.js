// Three-way merge for syncing the same account on several devices.
// base   = the state both devices last agreed on (last successful sync on this device)
// local  = this device now, remote = the cloud copy now (written by another device)
// Changes made on only one side are kept; deletions are detected by comparing with base.
// When both sides changed the same thing, the side that changed most recently wins.

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const eq = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const isIdList = (a) => Array.isArray(a) && a.every((x) => isObj(x) && x.id != null);

function mergeList(base, local, remote, preferLocal) {
  const B = new Map((base || []).filter(isObj).map((x) => [x.id, x]));
  const L = new Map(local.map((x) => [x.id, x]));
  const R = new Map(remote.map((x) => [x.id, x]));
  const order = [...local.map((x) => x.id), ...remote.map((x) => x.id).filter((id) => !L.has(id))];
  const out = [];
  for (const id of order) {
    const b = B.get(id), l = L.get(id), r = R.get(id);
    if (l && r) out.push(merge3(b, l, r, preferLocal));
    else if (l) { if (!(b && eq(b, l))) out.push(l); }      // remote deleted it: drop unless we changed it
    else if (r) { if (!(b && eq(b, r))) out.push(r); }      // we deleted it: drop unless they changed it
  }
  return out;
}

export function merge3(base, local, remote, preferLocal = true) {
  if (eq(local, remote)) return local;
  if (base !== undefined && eq(base, local)) return remote;
  if (base !== undefined && eq(base, remote)) return local;
  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const inL = k in local, inR = k in remote;
      if (inL && inR) out[k] = merge3(b[k], local[k], remote[k], preferLocal);
      else if (inL) { if (!(k in b && eq(b[k], local[k]))) out[k] = local[k]; }
      else if (!(k in b && eq(b[k], remote[k]))) out[k] = remote[k];
    }
    return out;
  }
  if (Array.isArray(local) && Array.isArray(remote) && isIdList(local) && isIdList(remote) && (local.length || remote.length)) {
    return mergeList(Array.isArray(base) ? base : [], local, remote, preferLocal);
  }
  return preferLocal ? local : remote;
}

/** Merge whole app states. Coins are added up (both devices may have earned some). */
export function mergeAppStates(base, local, remote, preferLocal) {
  const out = merge3(base, local, remote, preferLocal);
  const c = (s) => Number(s?.rewards?.coins) || 0;
  out.rewards = { ...(out.rewards || {}), coins: Math.max(0, c(base) + (c(local) - c(base)) + (c(remote) - c(base))) };
  return out;
}
