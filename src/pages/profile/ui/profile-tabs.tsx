"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { TrendingUp, Eye, Calendar } from "lucide-react"
import { authService } from "@/services/auth.service"
import axiosPrivate from "@/config/api"

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
  const navigate = useNavigate()
  const [results, setResults] = useState<TopResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserResults = async () => {
      try {
        setLoading(true)
        console.log("Fetching user overall test results...")
        
        // Make API call to get all user test results
        const response = await axiosPrivate.get("/api/overal-test-result/get-users")
        console.log("User results response:", response.data)
        
        // Extract results from response
        const userResults = response.data?.data || response.data || []
        setResults(userResults)
        
        console.log("User results loaded:", userResults.length, "results")
      } catch (error) {
        console.error("Error fetching user results:", error)
        // Fallback to topResults from user data if API fails
        try {
          const userData = await authService.getCurrentUser()
          setResults(userData?.topResults || [])
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError)
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUserResults()
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-full shadow-lg">
          <div className="p-2 bg-white/20 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold">Sınav Sonuçlarım</h2>
        </div>
        <p className="text-gray-600 mt-3 text-sm sm:text-base">
          Tüm sınav performanslarınızı buradan görüntüleyebilirsiniz
        </p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <TrendingUp className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Henüz sınav sonucu yok</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            İlk sınavınızı tamamladığınızda sonuçlar burada görünecek. Hemen bir sınav başlatın!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((test) => (
            <div
              key={test.id}
              className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-red-200 transition-all duration-300 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm">
                        {typeLabels[test.type]?.charAt(0) || test.type?.charAt(0) || 'T'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        {typeLabels[test.type] || test.type || 'Bilinmeyen Test'}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Calendar className="w-4 h-4" />
                        {test.createdAt ? new Date(test.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }) : 'Tarih bilinmiyor'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Score Badge */}
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {test.score || 0}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Puan</div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Performans</span>
                    <span>{test.score || 0}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        (test.score || 0) >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        (test.score || 0) >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${Math.min(test.score || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Performance Level */}
                <div className="mb-4">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    (test.score || 0) >= 80 ? 'bg-green-100 text-green-800' :
                    (test.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(test.score || 0) >= 80 ? 'Mükemmel' :
                     (test.score || 0) >= 60 ? 'İyi' : 'Geliştirilmeli'}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    console.log("Navigating to detailed results for test:", test.id)
                    navigate(`/overall-results/${test.id}`)
                  }}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg"
                >
                  <Eye className="w-4 h-4" />
                  Detayları Görüntüle
                </button>
              </div>

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProfileTabs
