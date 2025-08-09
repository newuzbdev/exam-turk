import { useNavigate } from 'react-router-dom';

const SpeakingDemo = () => {
  const navigate = useNavigate();

  const startDemo = () => {
    navigate('/speaking-test/demo');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8">
        <h1 className="text-6xl font-bold text-black mb-8">Yeni Konuşma Testi</h1>
        <p className="text-2xl text-black mb-8">
          Tamamen yeniden yazılmış, basit ve kullanıcı dostu konuşma testi sistemi
        </p>
        
        <div className="space-y-4 text-xl text-black mb-8">
          <div className="border border-gray-300 p-4 rounded-lg shadow-sm">
            ✓ Temiz ve modern tasarım
          </div>
          <div className="border border-gray-300 p-4 rounded-lg shadow-sm">
            ✓ Sadece siyah, beyaz, kırmızı renkler
          </div>
          <div className="border border-gray-300 p-4 rounded-lg shadow-sm">
            ✓ Basit kayıt sistemi
          </div>
          <div className="border border-gray-300 p-4 rounded-lg shadow-sm">
            ✓ Büyük metinler (daha okunabilir)
          </div>
          <div className="border border-gray-300 p-4 rounded-lg shadow-sm">
            ✓ Hatasız çalışma
          </div>
        </div>

        <button
          onClick={startDemo}
          className="w-full bg-red-600 text-white font-bold py-6 px-8 text-2xl hover:bg-red-700 transition-colors"
        >
          Demo Testi Başlat
        </button>
      </div>
    </div>
  );
};

export default SpeakingDemo;
