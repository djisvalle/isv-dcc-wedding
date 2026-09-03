export interface Guest {
  id: string;
  name: string;
  nickname?: string;
  is_coming: boolean | null;
  import_order?: number;
  is_baby_or_child?: boolean;
  parent_name?: string;
  role?: string;
  sex?: 'Male' | 'Female';
}

export interface Invite {
  id: string;
  name: string;
  nickname?: string;
}

export interface RsvpDeadline {
  date: Date | null;
  isPastDeadline: boolean;
}
