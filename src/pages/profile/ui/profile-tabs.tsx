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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
    })
  }

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

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-6 flex gap-4">
          <button
            className="px-6 py-3 rounded-full font-semibold bg-white text-black cursor-pointer"
          >
            Tam sınav raporları
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {results.length === 0 ? (
          <div className="text-center py-24">
            <h3 className="text-2xl font-bold text-black mb-3">Henüz sınav sonucu yok</h3>
            <p className="text-slate-600 max-w-md mx-auto text-lg">
              Sınavınızı tamamladığınızda sonuçlar burada görünecek.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                      Sınav ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                      Seçilen Testler
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                      Genel Puan
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                      Genel Coin
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                      Oluşturulma Tarihi
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-black">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((test, index) => (
                    <tr
                      key={test.id}
                      className={`border-b border-black ${
                        index === results.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-black">{test.id}</td>
                      <td className="px-6 py-4 text-sm text-black">
                        {getSelectedTests(test)}
                      </td>
                      <td className="px-6 py-4 text-sm text-black">
                        {test.overallScore}
                      </td>
                      <td className="px-6 py-4 text-sm text-black">
                        {test.overallCoin}
                      </td>
                      <td className="px-6 py-4 text-sm text-black">
                        {formatDate(test.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            console.log("Navigating to detailed results for test:", test.id)
                            navigate(`/overall-results/${test.id}`)
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4" />
                          Raporu Gör
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (pagination.page > 1) {
                        fetchUserResults(pagination.page - 1)
                      }
                    }}
                    disabled={pagination.page <= 1}
                    className="px-4 py-2 border border-black text-black rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Önceki
                  </button>

                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNumber
                    if (pagination.totalPages <= 5) {
                      pageNumber = i + 1
                    } else if (pagination.page <= 3) {
                      pageNumber = i + 1
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNumber = pagination.totalPages - 4 + i
                    } else {
                      pageNumber = pagination.page - 2 + i
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => fetchUserResults(pageNumber)}
                        className={`px-4 py-2 rounded font-medium cursor-pointer ${
                          pagination.page === pageNumber
                            ? "bg-red-600 text-white"
                            : "border border-black text-black"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  })}

                  <button
                    onClick={() => {
                      if (pagination.page < pagination.totalPages) {
                        fetchUserResults(pagination.page + 1)
                      }
                    }}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 border border-black text-black rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Sonraki
                  </button>
                </div>

                <p className="text-sm text-black font-medium">
                  Sayfa <span className="text-red-600 font-bold">{pagination.page}</span> /{" "}
                  <span className="text-black font-bold">{pagination.totalPages}</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default ProfileTabs
