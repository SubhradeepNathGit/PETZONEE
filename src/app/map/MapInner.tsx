'use client';

import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import Image from 'next/image';

/* -------- Red pin icon -------- */
const redIcon = new L.Icon({
    iconUrl:
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconRetinaUrl:
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

/* -------- Icons -------- */
const pinIcon = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
);
const phoneIcon = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.72 11.72 0 0 0 3.68.59 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.26.21 2.47.59 3.68a1 1 0 0 1-.24 1.01l-2.2 2.2z" />
    </svg>
);

/* -------- Types (subset needed for map) -------- */
/* -------- Types (subset needed for map) -------- */
export type UserRow = {
    id: string;
    first_name: string;
    last_name: string;
    email: string; // Added email
    role: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
};

interface MapInnerProps {
    withCoords: UserRow[];
    selected: UserRow | null;
    defaultCenter: [number, number];
    defaultZoom: number;
    setSelectedId: (id: string) => void;
}

export default function MapInner({
    withCoords,
    selected,
    defaultCenter,
    defaultZoom,
    setSelectedId,
}: MapInnerProps) {
    return (
        <MapContainer
            center={
                selected?.latitude && selected?.longitude
                    ? [selected.latitude, selected.longitude]
                    : defaultCenter
            }
            zoom={selected ? 12 : defaultZoom}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            zoomControl={true}
            scrollWheelZoom={true}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap &copy; CARTO"
            />

            <ViewportController
                items={withCoords}
                selected={selected}
                fallbackCenter={defaultCenter}
            />

            {withCoords.map((u) => (
                <Marker
                    key={u.id}
                    position={[u.latitude!, u.longitude!]}
                    icon={redIcon}
                    eventHandlers={{ click: () => setSelectedId(u.id) }}
                >
                    <Popup>
                        <div className="min-w-[180px]">
                            <div className="font-semibold text-slate-800">{`${u.first_name} ${u.last_name}`}</div>
                            <div className="text-xs text-slate-500 capitalize">
                                {u.role}
                            </div>
                            <div className="text-sm text-slate-700 mt-1">
                                {[u.city, u.state].filter(Boolean).join(', ') || '—'}
                            </div>
                            {u.phone && (
                                <div className="text-sm text-slate-700 mt-1">
                                    {phoneIcon} {u.phone}
                                </div>
                            )}
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* ✅ Floating Controls */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
                <MapControlButton
                    label="All"
                    title="Fit all users"
                    onClickId="fit-users"
                />
                <MapControlButton
                    label="India"
                    title="Reset to India"
                    onClickId="fit-india"
                />
                <MapControlButton
                    label="Me"
                    title="Locate me"
                    onClickId="locate-me"
                />
            </div>
        </MapContainer>
    );
}

/* -------- Map viewport controller -------- */
function ViewportController({
    items,
    selected,
    fallbackCenter,
}: {
    items: UserRow[];
    selected: UserRow | null;
    fallbackCenter: [number, number];
}) {
    const map = useMap();

    useEffect(() => {
        if (selected?.latitude != null && selected.longitude != null) {
            map.flyTo([selected.latitude, selected.longitude], 13, { duration: 0.7 });
            return;
        }
        const pts = items.map(
            (i) => [i.latitude!, i.longitude!] as [number, number]
        );
        if (pts.length === 0) {
            map.setView(fallbackCenter, 4);
        } else if (pts.length === 1) {
            map.setView(pts[0], 11);
        } else {
            const bounds = L.latLngBounds(pts);
            map.fitBounds(bounds.pad(0.2), { animate: true });
        }
    }, [items, selected, fallbackCenter, map]);

    // ✅ listen to floating buttons
    useEffect(() => {
        const handleClick = (e: Event) => {
            const target = e.target as HTMLElement;
            const action = target.getAttribute('data-map-action');
            if (!action) return;

            if (action === 'fit-users') {
                if (items.length > 0) {
                    const bounds = L.latLngBounds(
                        items.map((i) => [i.latitude!, i.longitude!] as [number, number])
                    );
                    map.fitBounds(bounds.pad(0.2), { animate: true });
                }
            }
            if (action === 'fit-india') {
                map.setView(fallbackCenter, 4);
            }
            if (action === 'locate-me') {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            map.flyTo([pos.coords.latitude, pos.coords.longitude], 13);
                        },
                        (err) => {
                            alert('Location access denied.');
                            console.error(err);
                        }
                    );
                }
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [items, fallbackCenter, map]);

    return null;
}

/* -------- Floating control button -------- */
function MapControlButton({
    label,
    title,
    onClickId,
}: {
    label: string;
    title: string;
    onClickId: string;
}) {
    return (
        <button
            className="px-3 py-1.5 rounded-lg bg-white shadow hover:bg-slate-100 text-sm font-medium border border-slate-200"
            title={title}
            data-map-action={onClickId}
        >
            {label}
        </button>
    );
}
