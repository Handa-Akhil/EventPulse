const EARTH_RADIUS_KM = 6371;

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

export function getDistanceKm(from, to) {
  if (!from || !to) {
    return null;
  }

  const latitudeDelta = degreesToRadians(to.lat - from.lat);
  const longitudeDelta = degreesToRadians(to.lng - from.lng);
  const startLatitude = degreesToRadians(from.lat);
  const endLatitude = degreesToRadians(to.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_KM * centralAngle;
}
