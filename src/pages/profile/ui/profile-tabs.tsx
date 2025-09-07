"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Eye, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { authService } from "@/services/auth.service"

interface TopResult {
  id: string
  type: string
  score: number
  createdAt: string
}

const typeLabels: Record<string, string> = {
  WRITING: "Yazma",
  READING: "Okuma",
  LISTENING: "Dinleme",
  SPEAKING: "Konuşma",
}

const ProfileTabs = () => {
  const [results, setResults] = useState<TopResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((userData) => setResults(userData?.topResults || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent"></div>
          <span className="text-gray-600 font-medium">Yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-red-500 to-red-600 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Son Sınav Performansı</h2>
          </div>
        </div>

        <div className="p-8">
          {results.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Henüz sınav sonucu yok</p>
              <p className="text-gray-400 text-sm mt-1">İlk sınavınızı tamamladığınızda sonuçlar burada görünecek</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((test) => (
                <div
                  key={test.id}
                  className="group relative bg-gray-50/50 hover:bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge
                          variant="secondary"
                          className="bg-red-50 text-red-700 hover:bg-red-100 font-semibold px-3 py-1 text-lg"
                        >
                          {typeLabels[test.type] || test.type}
                        </Badge>
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(test.createdAt).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-2xl font-bold text-gray-900">
                          {test.score}
                        </div>
                      </div>

                      <button
                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all duration-200 group-hover:opacity-100 opacity-60"
                        title="Detayları Görüntüle"
                        type="button"
                      >
                        <Eye className="w-5 h-5 text-red-500 transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileTabs
