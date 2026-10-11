'use client';

/**
 * The actual Leaflet map canvas.
 *
 * IMPORTANT: this module MUST only be imported through the SSR-safe dynamic
 * import in `marine-map.tsx` (`ssr: false`). Leaflet and react-leaflet
 * reference browser globals at module scope and will crash server rendering
 * if imported statically anywhere.
 *
 * NOTE: We intentionally do NOT paint fake weather grids/overlays. The map
 * is a point-based map: the forecast panel next to it shows real data for
 * the selected point (provider grid cells ~5 km).
 */
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { ForecastLocation, Spot } from '@/lib/models/types';

function iconFor(kind: 'selected' | 'spot' | 'favorite', size = 34): L.DivIcon {
  const color = kind === 'selected' ? '#21aca4' : kind === 'favorite' ? '#d97706' : '#3c75ad';
  const html = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,.35))">
      <path d="M12 22s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" fill="${color}" stroke="white" stroke-width="1.4"/>
      <circle cx="12" cy="11" r="2.6" fill="white"/>
    </svg>`;
  return L.divIcon({ className: 'sf-marker', html, iconSize: [size, size], iconAnchor: [size / 2, size] });
}

function ClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, Math.max(map.getZoom(), 8), { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

export default function MarineMapCanvas({
  selected,
  spots,
  center,
  onPick,
  onMarkerClick
}: {
  selected: ForecastLocation | null;
  spots: Spot[];
  center: [number, number];
  onPick?: (lat: number, lon: number) => void;
  onMarkerClick?: (spot: Spot) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);

  const initCenter: [number, number] = center ?? [31.8, -7.1];

  return (
    <MapContainer
      center={initCenter}
      zoom={6}
      className="h-full w-full"
      ref={(m) => {
        mapRef.current = m;
      }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClickHandler onPick={(lat, lon) => onPick?.(lat, lon)} />
      {selected ? (
        <Marker position={[selected.latitude, selected.longitude]} icon={iconFor('selected')} />
      ) : null}
      {spots.map((s) => (
        <Marker
          key={s.id}
          position={[s.latitude, s.longitude]}
          icon={iconFor(s.isFavorite ? 'favorite' : 'spot')}
          eventHandlers={
            onMarkerClick
              ? { click: () => onMarkerClick(s) }
              : undefined
          }
        />
      ))}
      <Recenter center={center ?? null} />
    </MapContainer>
  );
}
