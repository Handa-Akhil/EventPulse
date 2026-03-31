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
        console.error("Geolocation error code:", error.code, "message:", error.message);
        
        if (error.code === 1) {
          // Permission denied
          reject(new Error("Location permission denied. Please select your city from the dropdown or enable location access in browser settings."));
          return;
        }

        if (error.code === 2) {
          // Position unavailable
          reject(new Error("Location is currently unavailable. Please try again or select your city manually."));
          return;
        }

        if (error.code === 3) {
          // Timeout
          reject(new Error("Location request timed out. Please try again or select your city manually."));
          return;
        }

        reject(new Error("Unable to fetch the current location."));
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  });
}
