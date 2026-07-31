export interface Supplier {
  id: string;
  name: string;
  type: string;
  budget: number;
  created_at: any;
}

export interface Payment {
  id: string;
  supplier_id: string;
  amount: number;
  date: string;
  remarks: string;
  status: 'paid' | 'scheduled';
  created_at: any;
}
