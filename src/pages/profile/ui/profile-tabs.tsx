"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Eye } from "lucide-react"
import axiosPrivate from "@/config/api"
import { Card, CardContent } from "@/components/ui/card"

interface TestResult {
  id: string
  userId: string
  completedAt: string | null
  createdAt: string
  isCompleted: boolean
  listeningResultId: string | null
  listeningScore: number | null
  overallCoin: number
  overallScore: number
  readingResultId: string | null
  readingScore: number | null
  speakingResultId: string | null
  speakingScore: number | null
  startedAt: string
  status: string
  updatedAt: string
  writingResultId: string | null
  writingScore: number | null
}

interface PaginationData {
  total: number
  page: number
  limit: number
  data: TestResult[]
}

const getSelectedTests = (test: TestResult) => {
  const selectedTests = []
  if (test.readingResultId) selectedTests.push("Okuma")
  if (test.listeningResultId) selectedTests.push("Dinleme")
  if (test.writingResultId) selectedTests.push("Yazma")
  if (test.speakingResultId) selectedTests.push("Konuşma")
  return selectedTests.join(", ")
}

const getCefrLevel = (score: number | null | undefined): string => {
  if (score == null) return "-";
  if (score >= 65) return "C1";
  if (score >= 51) return "B2";
  if (score >= 38) return "B1";
  return "B1 altı";
};

const ProfileTabs = () => {
  const navigate = useNavigate()
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })

  const fetchUserResults = async (page: number = 1) => {
    try {
      setLoading(true)
      console.log(`Fetching user test results for page ${page}...`)
      
      // Fetch overall test results
      const response = await axiosPrivate.get(`/api/overal-test-result/get-users?page=${page}&limit=10`)
      
      console.log("User results response:", response.data)
      
      // Extract pagination data from response
      const paginationData: PaginationData = response.data
      setResults(paginationData.data || [])
      
      // Update pagination state
      const totalPages = Math.ceil(paginationData.total / paginationData.limit)
      setPagination({
        total: paginationData.total,
        page: paginationData.page,
        limit: paginationData.limit,
        totalPages
      })
      
      console.log("User results loaded:", paginationData.data?.length || 0, "results")
    } catch (error) {
      console.error("Error fetching user results:", error)
      setResults([])
      setPagination({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserResults(1)
  }, [])


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-slate-200 border-t-red-600"></div>
          <span className="text-slate-600 font-medium">Yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header with red underline */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 pb-2 border-b-2 border-red-600">
          Sınavlarım
        </h2>
      </div>

      {/* Table Content */}
      {results.length === 0 ? (
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardContent className="p-8">
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz sınav sonucu yok</h3>
              <p className="text-gray-600">
                Sınavınızı tamamladığınızda sonuçlar burada görünecek.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SINAV ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TESTLER
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PUAN
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        KREDİ MİKTARI
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TARİH
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İŞLEM
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {results.map((test) => {
                      const level = getCefrLevel(test.overallScore);
                      return (
                        <tr key={test.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                            {test.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {getSelectedTests(test)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="font-bold text-gray-900">{Math.round(test.overallScore || 0)}</span>
                            <span className="text-gray-600 ml-1">/ {level}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {test.overallCoin} Kredi
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(test.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => {
                                console.log("Navigating to detailed results for test:", test.id)
                                navigate(`/overall-results/${test.id}`)
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Görüntüle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  if (pagination.page > 1) {
                    fetchUserResults(pagination.page - 1)
                  }
                }}
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Önceki
              </button>

              <span className="px-3 py-2 text-sm text-gray-600">
                {pagination.page} / {pagination.totalPages}
              </span>

              <button
                onClick={() => {
                  if (pagination.page < pagination.totalPages) {
                    fetchUserResults(pagination.page + 1)
                  }
                }}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 text-sm  cursor-pointer border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ProfileTabs
