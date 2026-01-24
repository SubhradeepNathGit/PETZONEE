export type Role = 'admin' | 'user' | 'vet' | 'none' | 'loading';

export type VetRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  medical_doc_url: string | null;
  kyc_status: 'pending' | 'approved' | 'rejected';
  avatar_url?: string | null;
};

export type PetRow = {
  id: string;
  owner_id: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  image_url?: string | null; 
  photo?: string | null;     
  dob?: string | null;
  cover_url?: string | null;
};

export type PetUI = PetRow & { photo_resolved?: string | null };

export type SidebarItem = { 
  label: string; 
  href?: string; 
  onClick?: () => void; 
  badge?: number;
  icon?: React.ReactNode;
};
