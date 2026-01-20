import axiosPrivate from "@/config/api";

// Banner API interfaces
export interface Banner {
  id: string;
  name: string;
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  position?: 'top' | 'middle' | 'bottom';
  priority?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BannerApiResponse {
  total: number;
  page: number;
  limit: number;
  data: Banner[];
}


// Banner service for handling banner operations
export const bannerService = {
  // Get all banners
  getAllBanners: async (): Promise<Banner[]> => {
    try {
      const response = await axiosPrivate.get('/api/banner');
      const apiResponse: BannerApiResponse = response.data;
      return apiResponse.data || [];
    } catch (error: any) {
      // Don't show error toast for banners, just return empty array
      return [];
    }
  },


};

export default bannerService;
