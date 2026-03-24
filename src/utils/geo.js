async function reverseGeocode(lat, lng) {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
  );



  
  if (!response.ok) {
    throw new Error("Could not resolve the current city.");
  }

  const data = await response.json();
  const city = data.city || data.locality || data.principalSubdivision || "Current location";
  const region = data.principalSubdivision || data.countryName || "";
  const label = [city, region].filter(Boolean).join(", ");

  return {
    label,
    city,
    region,
    lat,
    lng,
    source: "gps",
  };
}

export function fetchCurrentLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new Error("Geolocation is not supported in this browser."),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const resolvedLocation = await reverseGeocode(lat, lng);
          resolve(resolvedLocation);
        } catch {
          resolve({
            label: "Current location",
            city: "Current location",
            region: "",
            lat,
            lng,
            source: "gps",
          });
        }
      },
      (error) => {
        if (error.code === 1) {
          reject(new Error("Location permission denied."));
          return;
        }

        reject(new Error("Unable to fetch the current location."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  });
}
