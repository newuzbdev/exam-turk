import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

const HomeLastMonthTopResults = () => {
  return (
    <div>
      <section className="py-12 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-2">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-gradient-to-r from-red-500 to-red-600 text-white border-none text-lg">
              <TrendingUp className="h-5 w-5 mr-2 animate-pulse" />
              Son 30 Gün Sonuçları
            </Badge>

            <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-4">
              En Yüksek Puanlar
            </h2>
          </div>

          <div className="space-y-3 max-w-7xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xl">
                    1
                  </div>

                  <div>
                    <p className="text-gray-900 font-semibold text-lg">
                      Mustafa Yıldırım
                    </p>
                    <p className="text-sm text-gray-500">20.06.2025 10:52</p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-red-500 font-bold text-2xl bg-red-50 px-4 py-1.5 rounded-xl">
                    C2
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                    D:9 • O:8.5 • Y:7.5 • K:8
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xl">
                    2
                  </div>

                  <div>
                    <p className="text-gray-900 font-semibold text-lg">
                      Ali Kaya
                    </p>
                    <p className="text-sm text-gray-500">28.05.2025 23:16</p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-red-500 font-bold text-2xl bg-red-50 px-4 py-1.5 rounded-xl">
                    C1
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                    D:9 • O:9 • Y:8.5 • K:8
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xl">
                    3
                  </div>

                  <div>
                    <p className="text-gray-900 font-semibold text-lg">
                      Ayşe Demir
                    </p>
                    <p className="text-sm text-gray-500">23.06.2025 15:02</p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-red-500 font-bold text-2xl bg-red-50 px-4 py-1.5 rounded-xl">
                    B2
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                    D:9 • O:9 • Y:8.5 • K:8
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xl">
                    4
                  </div>

                  <div>
                    <p className="text-gray-900 font-semibold text-lg">
                      Zeynep Şahin
                    </p>
                    <p className="text-sm text-gray-500">02.06.2025 17:27</p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-red-500 font-bold text-2xl bg-red-50 px-4 py-1.5 rounded-xl">
                    B1
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                    D:9 • O:8.5 • Y:8 • K:8
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xl">
                    5
                  </div>

                  <div>
                    <p className="text-gray-900 font-semibold text-lg">
                      Mehmet Öztürk
                    </p>
                    <p className="text-sm text-gray-500">04.06.2025 11:40</p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-red-500 font-bold text-2xl bg-red-50 px-4 py-1.5 rounded-xl">
                    B2
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                    D:9 • O:9 • Y:6.5 • K:7
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeLastMonthTopResults;
