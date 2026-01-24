'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import { useMap } from 'react-leaflet';

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

/* -------- SSR-safe dynamic imports -------- */
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((m) => m.Popup),
  { ssr: false }
);

/* -------- Types (your schema) -------- */
type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  user_id: string | null;
  role: 'user' | 'admin' | string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function LocationsPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [onlyCoords, setOnlyCoords] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);

      // ✅ get logged in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('users')
        .select(
          'id, first_name, last_name, email, phone, created_at, user_id, role, avatar_url, city, state, latitude, longitude'
        )
        .order('created_at', { ascending: false });

      if (ignore) return;
      if (error) {
        console.error('Supabase users error:', error);
        setRows([]);
      } else {
        const clean = (data ?? []).filter(
          (u) => u.role === 'user' || u.role === 'admin'
        );

        // ✅ Put logged-in user (if found) at the top
        let reordered = clean;
        if (user) {
          reordered = [
            ...clean.filter((u) => u.id === user.id),
            ...clean.filter((u) => u.id !== user.id),
          ];
        }

        setRows(reordered as UserRow[]);

        // ✅ Auto-select logged-in user if exists, otherwise first with coords
        if (user) {
          setSelectedId(user.id);
        } else {
          const firstWithCoords = reordered.find(
            (u) => u.latitude != null && u.longitude != null
          );
          if (firstWithCoords) setSelectedId(firstWithCoords.id);
        }
      }
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let res = rows;

    // role filter
    if (roleFilter !== 'all') res = res.filter((r) => r.role === roleFilter);

    // only coords
    if (onlyCoords)
      res = res.filter((r) => r.latitude != null && r.longitude != null);

    // search
    const s = q.trim().toLowerCase();
    if (s)
      res = res.filter((r) =>
        `${r.first_name} ${r.last_name} ${r.city ?? ''} ${r.state ?? ''} ${
          r.role ?? ''
        } ${r.email}`
          .toLowerCase()
          .includes(s)
      );

    return res;
  }, [rows, roleFilter, onlyCoords, q]);

  const withCoords = filtered.filter(
    (r) => r.latitude != null && r.longitude != null
  );
  const selected = filtered.find((r) => r.id === selectedId) ?? null;

  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const defaultZoom = 4;

  return (
    <div className="min-h-screen bg-white relative">
      {/* 🔹 Top Banner */}
      <div className="relative w-full h-40 sm:h-52 md:h-64 lg:h-80 mb-8">
        <Image
          src="/images/statbg11.jpg"
          alt="Locations Banner"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center text-center px-2">
          <h1 className="text-2xl md:text-4xl font-bold text-white">
            Discover on Map
          </h1>
          <p className="text-xs md:text-sm text-gray-200 mt-2">
            Home / Locations
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 md:px-6 pb-8">
        {/* 🔹 Filters + Search */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {['all', 'user', 'admin'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  roleFilter === role
                    ? 'bg-[#FF8A65] text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
            <button
              onClick={() => setOnlyCoords((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                onlyCoords
                  ? 'bg-[#FF7043] text-white shadow'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              With Location
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, city, state…"
              className="h-10 w-full md:w-72 rounded-3xl border border-slate-500 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A65]"
            />
            {!loading && (
              <span className="text-xs md:text-sm text-slate-500 shrink-0">
                {filtered.length} users · {withCoords.length} with location
              </span>
            )}
          </div>
        </div>

        {/* 🔹 Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Cards */}
          <aside className="space-y-4 overflow-y-auto max-h-[520px] md:max-h-[680px] pr-1">
            {loading ? (
              <LeftSkeleton />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500">No users found.</p>
            ) : (
              filtered.map((u, i) => (
                <UserCard
                  key={u.id}
                  user={u}
                  index={i}
                  active={selectedId ? selectedId === u.id : i === 0}
                  onClick={() => setSelectedId(u.id)}
                />
              ))
            )}
          </aside>

          {/* RIGHT: Map */}
          <section className="h-[400px] sm:h-[480px] md:h-[580px] lg:h-[680px] rounded-xl overflow-hidden shadow-lg relative">
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
          </section>
        </div>
      </div>
    </div>
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

/* -------- Card -------- */
function UserCard({
  user,
  index,
  active,
  onClick,
}: {
  user: UserRow;
  index: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const title = `${user.first_name} ${user.last_name}`.trim();
  const address = [user.city, user.state].filter(Boolean).join(', ');

  const activeStyle =
    active || index === 0
      ? 'bg-gradient-to-r from-[#FF8A65] to-[#FF7043] text-white shadow-lg'
      : 'bg-slate-50 text-slate-800 hover:bg-slate-100';

  return (
    <button
      onClick={onClick}
      className={`relative w-full rounded-2xl overflow-hidden shadow-md border transition-all duration-200 hover:scale-[1.01] transform ${
        active ? 'border-[#FF8A65] shadow-[#FF8A65]/20' : 'border-slate-200'
      } ${activeStyle}`}
    >
      <div className="relative flex items-center">
        <div className="flex-1 p-5 pr-28">
          <h3
            className={`text-lg font-bold ${
              active ? 'text-white' : 'text-slate-900'
            }`}
          >
            {title || 'Unnamed'}
          </h3>

          <div className="mt-1 flex items-start gap-2">
            <span className={`mt-1 ${active ? 'text-white/90' : 'text-slate-600'}`}>
              {pinIcon}
            </span>
            <p
              className={`text-sm ${active ? 'text-white/90' : 'text-slate-700'}`}
            >
              {address || '—'}
            </p>
          </div>

          {user.phone && (
            <div className="mt-1 flex items-center gap-2">
              <span className={active ? 'text-white/90' : 'text-slate-600'}>
                {phoneIcon}
              </span>
              <p
                className={`text-sm ${
                  active ? 'text-white/90' : 'text-slate-700'
                }`}
              >
                {user.phone}
              </p>
            </div>
          )}
        </div>

        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-16 w-16 rounded-full bg-white shadow p-1">
            <div className="h-full w-full overflow-hidden rounded-full relative">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={title}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">No Image</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* -------- Skeleton -------- */
function LeftSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

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
