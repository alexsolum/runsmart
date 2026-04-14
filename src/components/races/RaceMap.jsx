import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "done", label: "Done" },
  { value: "bucket-list", label: "Bucket list" },
];

function hasCoordinates(race) {
  const latitude = Number(race.latitude);
  const longitude = Number(race.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function getRaceState(race) {
  return (race.race_participations ?? []).length > 0 ? "done" : "bucket-list";
}

function getVisibleRaces(races, filter) {
  return races.filter((race) => {
    if (!hasCoordinates(race)) return false;
    if (filter === "done") return getRaceState(race) === "done";
    if (filter === "bucket-list") return getRaceState(race) === "bucket-list";
    return true;
  });
}

function buildIcon(kind) {
  return L.divIcon({
    className: "race-map__icon-shell",
    html: `<span class="race-map__marker race-map__marker--${kind}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
  });
}

function FitBounds({ races }) {
  const map = useMap();

  useEffect(() => {
    if (races.length === 0) return;

    const bounds = L.latLngBounds(races.map((race) => [Number(race.latitude), Number(race.longitude)]));
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, races]);

  return null;
}

export default function RaceMap({ races, onSelectRace = () => {} }) {
  const [filter, setFilter] = useState("all");

  const coordinateRaces = useMemo(() => races.filter(hasCoordinates), [races]);
  const visibleRaces = useMemo(() => getVisibleRaces(races, filter), [filter, races]);
  const center = coordinateRaces[0]
    ? [Number(coordinateRaces[0].latitude), Number(coordinateRaces[0].longitude)]
    : [0, 0];

  return (
    <section className="race-map" aria-label="Race map">
      <div className="race-map__header">
        <div className="race-map__filters" role="group" aria-label="Race map filters">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`race-map__filter${filter === option.value ? " is-active" : ""}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {coordinateRaces.length === 0 ? (
        <div className="race-map__empty">No races with coordinates yet.</div>
      ) : visibleRaces.length === 0 ? (
        <div className="race-map__empty">No races match this filter.</div>
      ) : (
        <div className="race-map__frame">
          <MapContainer center={center} zoom={4} scrollWheelZoom={false} className="race-map__container">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds races={visibleRaces} />
            {visibleRaces.map((race) => {
              const kind = getRaceState(race);

              return (
                <Marker
                  key={race.id}
                  position={[Number(race.latitude), Number(race.longitude)]}
                  icon={buildIcon(kind)}
                  eventHandlers={{ click: () => onSelectRace(race.id) }}
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    {race.name}
                  </Tooltip>
                  <Popup>
                    <div className="race-map__popup">
                      <strong>{race.name}</strong>
                      {race.location && <span>{race.location}</span>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </section>
  );
}
