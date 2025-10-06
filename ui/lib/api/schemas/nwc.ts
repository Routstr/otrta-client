export interface NwcConnection {
  id: string;
  organization_id: string;
  name: string;
  connection_uri: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNwcConnection {
  name: string;
  connection_uri: string;
}

export interface UpdateNwcConnection {
  name?: string;
  connection_uri?: string;
  is_active?: boolean;
}

export interface NwcTestRequest {
  connection_uri: string;
}

export interface NwcTestResponse {
  success: boolean;
  methods: string[];
  alias?: string;
}

export interface PayInvoiceRequest {
  invoice: string;
}

export interface PayInvoiceResponse {
  success: boolean;
  preimage?: string;
  error?: string;
}
