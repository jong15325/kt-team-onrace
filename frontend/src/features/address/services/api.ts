import { apiClient } from '@/lib/apiClient';
import { IAddressService } from './interface';

export const addressApi: IAddressService = {
  getAddress: async () => {
    const response = await apiClient.get('/address');
    return response.data;
  },
  getDefaultAddress: async () => {
    const response = await apiClient.get('/address/default');
    return response.data;
  },
  getAddressById: async (id) => {
    const response = await apiClient.get(`/address/${id}`);
    return response.data;
  },
  postAddress: async (data) => {
    const response = await apiClient.post('/address', data);
    return response.data;
  },
  updateAddress: async (id, data) => {
    const response = await apiClient.put(`/address/${id}`, data);
    return response.data;
  },
  deleteAddress: async (id) => {
    const response = await apiClient.delete(`/address/${id}`);
    return response.data;
  },
  updateDefaultAddress: async (id) => {
    const response = await apiClient.patch(`/address/${id}/default`);
    return response.data;
  },
};
