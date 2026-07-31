export type TableType = 'bridal' | 'vip' | 'regular';

export interface Guest {
  id: string;
  name: string;
  nickname?: string;
  role: string | null;
  invite_id: string | null;
  is_coming: boolean | null;
  updated_at: any;
  table_type?: TableType;
  table_number?: string;
  import_order?: number;
  is_baby_or_child?: boolean;
  parent_name?: string;
}
