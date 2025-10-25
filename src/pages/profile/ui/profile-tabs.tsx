"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Eye } from "lucide-react"
import axiosPrivate from "@/config/api"

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
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <h1 className="text-5xl font-bold text-black">Sınavlarım</h1>
        </div>
      </div>


      {/* Table Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {results.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz sınav sonucu yok</h3>
            <p className="text-gray-600">
              Sınavınızı tamamladığınızda sonuçlar burada görünecek.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Sınav ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Testler
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Puan
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Coin
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                        {test.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getSelectedTests(test)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-semibold text-gray-900">{test.overallScore}</span>
                        <span className="text-gray-500 ml-1">/75</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-semibold text-yellow-600">{test.overallCoin}</span>
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          Görüntüle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default ProfileTabs
