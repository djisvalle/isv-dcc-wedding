export interface Invite {
  id: string;
  name: string;
  import_order?: number;
  created_at?: any;
}

export interface InviteWithCounts extends Invite {
  guest_count: number;
  attending_count: number;
}
