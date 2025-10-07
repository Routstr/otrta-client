import { apiClient } from '../client';
import {
  NwcConnection,
  CreateNwcConnection,
  UpdateNwcConnection,
  NwcTestRequest,
  NwcTestResponse,
  PayInvoiceRequest,
  PayInvoiceResponse,
} from '../schemas/nwc';

interface NwcConnectionsResponse {
  connections: NwcConnection[];
}

export class NwcService {
  // NWC Connections
  static async listConnections(): Promise<NwcConnection[]> {
    try {
      const response = await apiClient.get<NwcConnectionsResponse>(
        '/api/nwc/connections'
      );
      return response.connections;
    } catch (error) {
      console.error('Error fetching NWC connections:', error);
      throw error;
    }
  }

  static async createConnection(
    data: CreateNwcConnection
  ): Promise<NwcConnection> {
    try {
      return await apiClient.post<NwcConnection>(
        '/api/nwc/connections',
        data as unknown as Record<string, unknown>
      );
    } catch (error) {
      console.error('Error creating NWC connection:', error);
      throw error;
    }
  }

  static async updateConnection(
    connectionId: string,
    data: UpdateNwcConnection
  ): Promise<NwcConnection> {
    try {
      return await apiClient.put<NwcConnection>(
        `/api/nwc/connections/${connectionId}`,
        data as unknown as Record<string, unknown>
      );
    } catch (error) {
      console.error(`Error updating NWC connection ${connectionId}:`, error);
      throw error;
    }
  }

  static async deleteConnection(connectionId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/nwc/connections/${connectionId}`);
    } catch (error) {
      console.error(`Error deleting NWC connection ${connectionId}:`, error);
      throw error;
    }
  }

  static async testConnection(data: NwcTestRequest): Promise<NwcTestResponse> {
    try {
      return await apiClient.post<NwcTestResponse>(
        '/api/nwc/test',
        data as unknown as Record<string, unknown>
      );
    } catch (error) {
      console.error('Error testing NWC connection:', error);
      throw error;
    }
  }

  // Invoice payment
  static async payInvoice(
    connectionId: string,
    data: PayInvoiceRequest
  ): Promise<PayInvoiceResponse> {
    try {
      return await apiClient.post<PayInvoiceResponse>(
        `/api/nwc/connections/${connectionId}/pay`,
        data as unknown as Record<string, unknown>
      );
    } catch (error) {
      console.error(
        `Error paying invoice via connection ${connectionId}:`,
        error
      );
      throw error;
    }
  }
}
