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

const median = (nums: number[]): number => {
  const sorted = [...nums].sort((a, b) => a - b); // ← numeric sort, see gotcha
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

export { haversineDistanceMeters, median };
