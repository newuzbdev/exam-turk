const StatsSection = () => {
  return (
    <div>
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                15,000+
              </div>
              <div className="text-gray-600">
                Aktif Kullanıcı
                <span className="block text-xs text-gray-400 mt-1">
                  Her gün yeni deneme sınavları çözüyor
                </span>
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                50,000+
              </div>
              <div className="text-gray-600">
                Tamamlanan Test
                <span className="block text-xs text-gray-400 mt-1">
                  Soru seviyeleri gerçek verilerle kalibre edildi
                </span>
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                98%
              </div>
              <div className="text-gray-600">
                Memnuniyet Oranı
                <span className="block text-xs text-gray-400 mt-1">
                  Kullanıcı geri bildirimlerine göre sürekli iyileşen sistem
                </span>
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                24/7
              </div>
              <div className="text-gray-600">
                Destek Hizmeti
                <span className="block text-xs text-gray-400 mt-1">
                  Sınav öncesi ve sonrası sorularınız için yanınızdayız
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StatsSection;
