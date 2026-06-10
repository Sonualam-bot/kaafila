const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Calculates the great-circle distance between two points on Earth using the
 * haversine formula — the shortest distance over the Earth's surface, ignoring
 * elevation.
 *
 * Note: assumes a spherical Earth (radius 6,371 km). Good to ~0.5% accuracy,
 * which is plenty for ride-tracking and lag calculations.
 *
 * @param lat1 - Latitude of the first point, in decimal degrees.
 * @param lng1 - Longitude of the first point, in decimal degrees.
 * @param lat2 - Latitude of the second point, in decimal degrees.
 * @param lng2 - Longitude of the second point, in decimal degrees.
 * @returns The distance between the two points, in meters.
 *
 * @example
 * // Distance between two nearby points (~157 m)
 * haversineDistanceMeters(12.9716, 77.5946, 12.9730, 77.5946);
 */
function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const EARTH_RADIUS_METERS = 6371000;

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLatRad = toRadians(lat2 - lat1);
  const deltaLngRad = toRadians(lng2 - lng1);

  const halfChordSquared =
    Math.sin(deltaLatRad / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLngRad / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(Math.sqrt(halfChordSquared), Math.sqrt(1 - halfChordSquared));

  return EARTH_RADIUS_METERS * angularDistance;
}

/**
 * Median of a list of numbers — used for the group centroid (per axis) because
 * it's robust to outliers: unlike the mean, one extreme value can't drag it.
 * For an even count, returns the average of the two middle values.
 * Note: sorts with a numeric comparator (JS default sort is lexicographic).
 */
const median = (nums: number[]): number => {
  const sorted = [...nums].sort((a, b) => a - b); // ← numeric sort, see gotcha
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Initial compass bearing (forward azimuth) from point 1 to point 2.
 *
 * "Initial" matters: along a great-circle path the bearing changes as you
 * travel, so this is the heading you'd set off on at point 1 — not a constant
 * course. Used to tell which direction a rider is moving relative to the group.
 *
 * @param lat1 - Latitude of the start point, in decimal degrees.
 * @param lng1 - Longitude of the start point, in decimal degrees.
 * @param lat2 - Latitude of the destination point, in decimal degrees.
 * @param lng2 - Longitude of the destination point, in decimal degrees.
 * @returns Bearing in degrees, normalized to [0, 360): 0 = north, 90 = east,
 *          180 = south, 270 = west.
 *
 * @example
 * bearing(0, 0, 0, 1); // 90  (due east)
 * bearing(0, 0, 1, 0); // 0   (due north)
 */
const bearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLngRad = toRadians(lng2 - lng1);

  const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);

  const bearingDeg = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearingDeg + 360) % 360; // atan2 gives -180..180 → shift into 0..360
};

/**
 * Smallest angle between two compass bearings, accounting for wraparound.
 *
 * Bearings live on a circle, so a naive `|a - b|` is wrong near the 0/360 seam:
 * 350° and 10° are 20° apart, not 340°. This always returns the shorter arc.
 *
 * @param a - First bearing, in degrees.
 * @param b - Second bearing, in degrees.
 * @returns The angular separation in degrees, in [0, 180].
 *
 * @example
 * angularDifference(350, 10); // 20
 * angularDifference(0, 180);  // 180
 */
const angularDifference = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

export { haversineDistanceMeters, median, bearing, angularDifference };
