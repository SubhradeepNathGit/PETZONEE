'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { PetMapRow } from './MapInner';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

/* -------- SSR-safe dynamic imports -------- */
const MapInner = dynamic(
  () => import('./MapInner'),
  { ssr: false, loading: () => <div className="w-full h-full bg-[#0a0a0f] flex items-center justify-center text-white/50 animate-pulse">Loading Map...</div> }
);

/* -------- Icons -------- */
const pinIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

export default function LocationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PetMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [onlyCoords, setOnlyCoords] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fetch pets and join with users for owner info and coordinates
      const { data, error } = await supabase
        .from('pets')
        .select(`
          id, name, species, breed, avatar_url, owner_id,
          users ( first_name, last_name, phone, city, state, latitude, longitude )
        `);

      if (ignore) return;
      if (error) {
        console.error('Supabase fetch error:', error);
        setRows([]);
      } else if (data) {
        // Map joined data to PetMapRow format
        const mappedData: PetMapRow[] = data.map((pet: any) => {
          const owner = pet.users || {};
          return {
            id: pet.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            avatar_url: pet.avatar_url,
            owner_id: pet.owner_id,
            owner_name: `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Unknown Owner',
            owner_phone: owner.phone,
            city: owner.city,
            state: owner.state,
            latitude: owner.latitude,
            longitude: owner.longitude,
          };
        });

        // Put logged-in user's pets at the top
        let reordered = mappedData;
        if (user) {
          reordered = [
            ...mappedData.filter((p) => p.owner_id === user.id),
            ...mappedData.filter((p) => p.owner_id !== user.id),
          ];
        }

        setRows(reordered);

        // Auto-select first pet with coords
        const firstWithCoords = reordered.find(
          (p) => p.latitude != null && p.longitude != null
        );
        if (firstWithCoords) setSelectedId(firstWithCoords.id);
      }
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let res = rows;

    // species filter
    if (speciesFilter !== 'all') {
      res = res.filter((r) => r.species?.toLowerCase() === speciesFilter.toLowerCase());
    }

    // only coords
    if (onlyCoords)
      res = res.filter((r) => r.latitude != null && r.longitude != null);

    // search
    const s = q.trim().toLowerCase();
    if (s)
      res = res.filter((r) =>
        `${r.name} ${r.breed ?? ''} ${r.city ?? ''} ${r.owner_name} ${r.state ?? ''}`
          .toLowerCase()
          .includes(s)
      );

    return res;
  }, [rows, speciesFilter, onlyCoords, q]);

  const withCoords = filtered.filter(
    (r) => r.latitude != null && r.longitude != null
  );
  const selected = filtered.find((r) => r.id === selectedId) ?? null;

  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const defaultZoom = 4;

  const uniqueSpecies = useMemo(() => {
    const speciesSet = new Set(rows.map(r => r.species?.toLowerCase()).filter(Boolean));
    return ['all', ...Array.from(speciesSet)];
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative font-sans">
      {/* Premium Gradient Overlay */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-[#1a1311] via-[#0a0a0f] to-transparent pointer-events-none opacity-50"></div>

      <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80 mb-8 overflow-hidden">
        <Image
          src="/images/statbg7.jpg"
          alt="Discover Pets"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-center px-4 z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A65] to-[#FF7043]">Nearby Pets</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-3 overflow-hidden">
            <button
              onClick={() => router.push('/')}
              className="text-white/50 hover:text-white transition-colors duration-200 font-medium text-xs sm:text-sm"
            >
              Home
            </button>
            <span className="text-white/20 text-xs">/</span>
            <p className="text-xs sm:text-sm text-[#FF8A65]/80 font-semibold">Discover</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 md:px-8 pb-12 relative z-10">
        {/* Filters + Search Panel */}
        <div className="mb-8 p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-xl shadow-2xl flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          {/* Left Filters */}
          <div className="flex flex-wrap gap-2.5">
            {uniqueSpecies.slice(0, 5).map((species) => {
              if (typeof species !== 'string') return null;
              const isActive = speciesFilter === species;
              return (
                <button
                  key={species}
                  onClick={() => setSpeciesFilter(species)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${isActive
                    ? 'bg-gradient-to-r from-[#FF8A65] to-[#FF7043] text-white shadow-[0_0_15px_rgba(255,138,101,0.3)]'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                    } capitalize tracking-wide`}
                >
                  {species}
                </button>
              );
            })}
            <div className="w-[1px] h-8 bg-white/10 mx-2 self-center hidden sm:block"></div>
            <button
              onClick={() => setOnlyCoords((v) => !v)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${onlyCoords
                ? 'bg-white/10 text-white border-white/20 shadow-inner'
                : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80 border border-transparent'
                }`}
            >
              {pinIcon} With Location
            </button>
          </div>

          {/* Right Search & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-[#FF8A65] transition-colors" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search pets, breeds, cities..."
                className="h-11 w-full sm:w-72 rounded-xl bg-black/40 border border-white/10 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FF8A65]/50 focus:ring-1 focus:ring-[#FF8A65]/50 transition-all font-medium"
              />
            </div>
            {!loading && (
              <div className="px-4 py-2.5 rounded-xl bg-black/40 border border-white/5 text-xs font-bold text-white/50 tracking-wider flex items-center gap-2 shrink-0">
                <span className="text-[#FF8A65]">{filtered.length}</span> PETS
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                <span className="text-white">{withCoords.length}</span> MAPPED
              </div>
            )}
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[600px] lg:h-[750px]">
          {/* LEFT: Cards Scroll Area */}
          <aside className="lg:col-span-4 h-full flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar pb-20 lg:pb-0">
            {loading ? (
              <LeftSkeleton />
            ) : filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/[0.02] rounded-2xl border border-white/5">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <span className="text-2xl opacity-50">🔍</span>
                </div>
                <h3 className="text-white font-bold text-lg">No pets found</h3>
                <p className="text-white/40 text-sm mt-1">Try adjusting your filters or search term</p>
              </div>
            ) : (
              filtered.map((u) => (
                <PetCard
                  key={u.id}
                  pet={u}
                  active={selectedId === u.id}
                  onClick={() => setSelectedId(u.id)}
                />
              ))
            )}
          </aside>

          {/* RIGHT: Map Container */}
          <section className="lg:col-span-8 h-full rounded-2xl overflow-hidden shadow-2xl relative border border-white/10 bg-[#0d0d14]">
            <MapInner
              withCoords={withCoords}
              selected={selected}
              defaultCenter={defaultCenter}
              defaultZoom={defaultZoom}
              setSelectedId={setSelectedId}
            />
          </section>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 138, 101, 0.5);
        }
      `}</style>
    </div>
  );
}


/* -------- Pet Card -------- */
function PetCard({
  pet,
  active,
  onClick,
}: {
  pet: PetMapRow;
  active?: boolean;
  onClick?: () => void;
}) {
  const address = [pet.city, pet.state].filter(Boolean).join(', ');

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-300 group ${active
        ? 'bg-gradient-to-r from-white/[0.08] to-transparent border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
        : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10'
        }`}
    >
      <div className={`relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 transition-transform duration-500 ${active ? 'scale-105 shadow-[0_0_15px_rgba(255,138,101,0.3)]' : 'group-hover:scale-105'}`}>
        {active && (
          <div className="absolute inset-0 border-2 border-[#FF8A65] rounded-full z-10 pointer-events-none"></div>
        )}
        <Image
          src={pet.avatar_url || '/images/placeholder.png'}
          alt={pet.name}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5">
          <h3 className={`text-lg font-black truncate ${active ? 'text-white' : 'text-white/90'}`}>
            {pet.name}
          </h3>
          {pet.species && (
            <span className="text-[9px] font-black uppercase tracking-wider text-[#FF8A65] bg-[#FF8A65]/10 px-2 py-0.5 rounded-full">
              {pet.species}
            </span>
          )}
        </div>

        {pet.breed && (
          <p className="text-xs font-semibold text-white/50 truncate mb-2">{pet.breed}</p>
        )}

        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex items-center gap-2">
            <span className={`${active ? 'text-[#FF8A65]' : 'text-white/30'}`}>
              {pinIcon}
            </span>
            <p className="text-xs font-medium text-white/60 truncate">
              {address || 'Location hidden'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`${active ? 'text-[#FF8A65]' : 'text-white/30'}`}>
              <UserIcon />
            </span>
            <p className="text-xs font-medium text-white/60 truncate">
              {pet.owner_name}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

/* -------- Skeleton -------- */
function LeftSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-white/5 flex-shrink-0"></div>
          <div className="flex-1 py-1">
            <div className="h-5 bg-white/10 rounded-md w-1/2 mb-3"></div>
            <div className="h-3 bg-white/5 rounded-md w-3/4 mb-2"></div>
            <div className="h-3 bg-white/5 rounded-md w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
