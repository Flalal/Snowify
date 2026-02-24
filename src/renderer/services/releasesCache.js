import { HOME_RELEASES_CACHE_TTL } from '../../shared/constants.js';

let _cached = null;
let _ts = 0;

export function getCachedReleases() {
  if (_cached && Date.now() - _ts < HOME_RELEASES_CACHE_TTL) return _cached;
  return null;
}

export function setCachedReleases(releases) {
  _cached = releases;
  _ts = Date.now();
}

export function invalidateReleasesCache() {
  _cached = null;
  _ts = 0;
}
