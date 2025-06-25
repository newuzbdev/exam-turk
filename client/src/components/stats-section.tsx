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
              <div className="text-gray-600">Aktif Kullanıcı</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                50,000+
              </div>
              <div className="text-gray-600">Tamamlanan Test</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                98%
              </div>
              <div className="text-gray-600">Memnuniyet Oranı</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-200">
                24/7
              </div>
              <div className="text-gray-600">Destek Hizmeti</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StatsSection;
