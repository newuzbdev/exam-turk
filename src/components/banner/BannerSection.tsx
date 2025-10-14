import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, Star } from 'lucide-react';
import { bannerService, type Banner } from '@/services/banner.service';

interface BannerSectionProps {
  position?: 'top' | 'middle' | 'bottom';
  className?: string;
}

export const BannerSection: React.FC<BannerSectionProps> = ({
  position = 'middle',
  className = ''
}) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedBanners, _setDismissedBanners] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBanners();
  }, [position]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const allBanners = await bannerService.getAllBanners();
      
      // Filter banners by position and active status
      // If no position is specified in banner, show it for 'top' position
      const filteredBanners = allBanners.filter(banner => {
        const hasCorrectPosition = !banner.position || banner.position === position;
        const isActive = banner.isActive !== false;
        return hasCorrectPosition && isActive;
      });
      
      // If no banners found and we're looking for 'top' position, show banners without position
      if (filteredBanners.length === 0 && position === 'top') {
        const fallbackBanners = allBanners.filter(banner => banner.isActive !== false);
        setBanners(fallbackBanners);
        return;
      }
      
      setBanners(filteredBanners);
    } catch (error) {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  };

  // Dismiss handler is not currently used; remove to avoid unused warnings

  const handleBannerClick = (banner: Banner) => {
    if (banner.linkUrl) {
      if (banner.linkUrl.startsWith('http')) {
        window.open(banner.linkUrl, '_blank');
      } else {
        window.location.href = banner.linkUrl;
      }
    }
  };

  const isBannerActive = (banner: Banner) => {
    const now = new Date();
    const startDate = banner.startDate ? new Date(banner.startDate) : null;
    const endDate = banner.endDate ? new Date(banner.endDate) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  };

  const activeBanners = banners.filter(banner => 
    isBannerActive(banner) && !dismissedBanners.has(banner.id)
  );

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (activeBanners.length === 0) {
    return null;
  }

  return (
    <div className={`w-full bg-gray-50 py-8 ${className}`}>
      {activeBanners.map((banner) => (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <Card 
            key={banner.id} 
            className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl border-0 shadow-lg min-h-[400px] bg-white ${
              banner.linkUrl ? 'cursor-pointer hover:scale-[1.02]' : ''
            }`}
            onClick={() => handleBannerClick(banner)}
          >
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              {/* Banner Content - Left Side */}
              <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-6">
                      <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">{banner.name || banner.title}</h3>
                      {banner.priority && banner.priority > 0 && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1" />
                          Öne Çıkan
                        </Badge>
                      )}
                    </div>
                    
                    {banner.description && (
                      <p className="text-lg lg:text-xl text-gray-600 mb-8 leading-relaxed">
                        {banner.description}
                      </p>
                    )}

                    {/* Banner Dates */}
                    {(banner.startDate || banner.endDate) && (
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {banner.startDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Başlangıç: {new Date(banner.startDate).toLocaleDateString('tr-TR')}</span>
                          </div>
                        )}
                        {banner.endDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Bitiş: {new Date(banner.endDate).toLocaleDateString('tr-TR')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-6">
                    {banner.linkUrl && (
                      <Button
                        size="sm"
                        variant="default"
                        className="flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBannerClick(banner);
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Detay
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner Image - Right Side */}
              {banner.imageUrl && (
                <div className="relative w-full lg:w-[450px] h-[450px] lg:h-full min-h-[400px] overflow-hidden rounded-md m-4">
                  <img
                    src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `https://api.turkcetest.uz/${banner.imageUrl}`}
                    alt={banner.name || banner.title}
                    className="w-full h-full object-cover rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default BannerSection;
