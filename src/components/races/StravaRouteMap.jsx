import React, { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function FitPolyline({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [16, 16] });
  }, [map, positions]);

  return null;
}

export default function StravaRouteMap({ polyline }) {
  const positions = useMemo(() => {
    if (!polyline) return [];

    try {
      return decodePolyline(polyline);
    } catch {
      return [];
    }
  }, [polyline]);

  if (positions.length === 0) {
    return (
      <p className="py-4 text-center text-sm italic text-slate-400">
        No route data available for this activity.
      </p>
    );
  }

  return (
    <MapContainer
      center={positions[0]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: 200, borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitPolyline positions={positions} />
      <Polyline positions={positions} color="#3b82f6" weight={3} />
      <CircleMarker
        center={positions[0]}
        radius={6}
        pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1 }}
      />
      <CircleMarker
        center={positions[positions.length - 1]}
        radius={6}
        pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
