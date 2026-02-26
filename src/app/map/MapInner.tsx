'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import Image from 'next/image';

/* -------- Icons -------- */
const pinIcon = (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
);

/* -------- Types -------- */
export type PetMapRow = {
    id: string;
    name: string;
    species: string | null;
    breed: string | null;
    avatar_url: string | null;
    owner_id: string;
    owner_name: string;
    owner_phone: string | null;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
};

interface MapInnerProps {
    withCoords: PetMapRow[];
    selected: PetMapRow | null;
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
    // Generate custom markers
    const createCustomIcon = (pet: PetMapRow, isSelected: boolean) => {
        const imageUrl = pet.avatar_url || '/images/placeholder.png';
        const sizeClass = isSelected ? 'w-14 h-14' : 'w-10 h-10';
        const shadowClass = isSelected ? 'shadow-[0_0_15px_rgba(255,138,101,0.8)]' : 'shadow-md shadow-black/50';

        const html = `
            <div class="relative flex items-center justify-center ${sizeClass} transition-all duration-300 transform ${isSelected ? 'scale-110 z-50' : 'hover:scale-110 z-10'}">
                <div class="absolute inset-0 ${isSelected ? 'bg-gradient-to-tr from-[#FF8A65] to-[#FF7043] animate-pulse' : 'bg-white/20'} rounded-full ${shadowClass}"></div>
                <div class="absolute inset-[2px] bg-[#0a0a0f] rounded-full overflow-hidden flex items-center justify-center">
                    <img src="${imageUrl}" class="w-full h-full object-cover" alt="Pet" onerror="this.src='/images/placeholder.png'" />
                </div>
            </div>
        `;

        return L.divIcon({
            className: 'custom-pet-marker bg-transparent border-none',
            html: html,
            iconSize: isSelected ? [56, 56] : [40, 40],
            iconAnchor: isSelected ? [28, 28] : [20, 20],
            popupAnchor: [0, isSelected ? -30 : -22],
        });
    };

    return (
        <MapContainer
            center={
                selected?.latitude && selected?.longitude
                    ? [selected.latitude, selected.longitude]
                    : defaultCenter
            }
            zoom={selected ? 13 : defaultZoom}
            style={{ height: '100%', width: '100%', zIndex: 1, backgroundColor: '#0a0a0f' }}
            zoomControl={false}
            scrollWheelZoom={true}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap &copy; CARTO"
            />

            <ViewportController
                items={withCoords}
                selected={selected}
                fallbackCenter={defaultCenter}
            />

            {withCoords.map((u) => {
                const isSelected = selected?.id === u.id;
                return (
                    <Marker
                        key={u.id}
                        position={[u.latitude!, u.longitude!]}
                        icon={createCustomIcon(u, isSelected)}
                        eventHandlers={{ click: () => setSelectedId(u.id) }}
                        zIndexOffset={isSelected ? 1000 : 0}
                    >
                        <Popup className="pet-popup">
                            <div className="min-w-[220px] bg-[#0d0d14]/90 text-white p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl -m-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#FF8A65] flex-shrink-0">
                                        <img src={u.avatar_url || '/images/placeholder.png'} alt={u.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-white leading-tight">{u.name}</div>
                                        <div className="text-[10px] font-bold text-[#FF8A65] uppercase tracking-wider mt-0.5">
                                            {u.species || 'PET'} {u.breed ? `• ${u.breed}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                                    <div className="flex items-center gap-2.5 text-sm text-white/70">
                                        <span className="text-[#FF8A65]">{pinIcon}</span>
                                        <span className="truncate font-medium">{[u.city, u.state].filter(Boolean).join(', ') || 'Location unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-sm text-white/70">
                                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-medium border border-white/5">👤</div>
                                        <span className="truncate font-medium">Owner: <span className="text-white/90">{u.owner_name}</span></span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            {/* Floating Controls */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2.5 shadow-xl">
                <MapControlButton label="All" title="Fit all pets" onClickId="fit-users" />
                <MapControlButton label="India" title="Reset to India" onClickId="fit-india" />
                <MapControlButton label="Me" title="Locate me" onClickId="locate-me" />
            </div>

            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    background: transparent;
                box-shadow: none;
                padding: 0;
                }
                .leaflet-popup-tip-container {
                    display: none;
                }
                .leaflet-popup-content {
                    margin: 0;
                }
            `}</style>
        </MapContainer>
    );
}

/* -------- Map viewport controller -------- */
function ViewportController({
    items,
    selected,
    fallbackCenter,
}: {
    items: PetMapRow[];
    selected: PetMapRow | null;
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
            className="px-4 py-2.5 rounded-xl bg-black/40 backdrop-blur-xl shadow-lg hover:bg-black/60 text-sm font-bold text-white border border-white/10 transition-all focus:outline-none flex items-center justify-center hover:border-white/30"
            title={title}
            data-map-action={onClickId}
        >
            {label}
        </button>
    );
}
