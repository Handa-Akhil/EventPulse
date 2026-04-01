import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function EventMap({ events = [], userLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      const center = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [20.5937, 78.9629]; // Default: center of India

      mapInstanceRef.current = L.map(mapRef.current, {
        center,
        zoom: userLocation ? 11 : 5,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // User location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "map-user-marker",
        html: `<div class="map-marker map-marker--user">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<strong>Your Location</strong><br/>${userLocation.label || "Current location"}`);
    }

    // Event markers
    for (const event of events) {
      if (!event.coordinates?.lat || !event.coordinates?.lng) continue;
      if (event.coordinates.lat === 0 && event.coordinates.lng === 0) continue;

      const eventIcon = L.divIcon({
        className: "map-event-marker",
        html: `<div class="map-marker map-marker--event">🎪</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const popupContent = `
        <div class="map-popup">
          <strong>${event.title}</strong>
          <p>${event.venue}, ${event.city}</p>
          <p>Rs. ${event.price} · ${event.dateLabel || ""}</p>
          <a href="/events/${event.id}" class="map-popup-link">View Details →</a>
        </div>
      `;

      L.marker([event.coordinates.lat, event.coordinates.lng], { icon: eventIcon })
        .addTo(map)
        .bindPopup(popupContent);
    }

    // Fit bounds if events exist
    const validEvents = events.filter(
      (e) => e.coordinates?.lat && e.coordinates?.lng && !(e.coordinates.lat === 0 && e.coordinates.lng === 0)
    );

    if (validEvents.length > 0 && userLocation) {
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        ...validEvents.map((e) => [e.coordinates.lat, e.coordinates.lng]),
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

    return () => {};
  }, [events, userLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="event-map-wrapper panel">
      <div ref={mapRef} className="event-map" />
    </div>
  );
}
