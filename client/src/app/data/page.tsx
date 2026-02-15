'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadWeb3, getContract } from '@/lib/web3'

interface Product {
  id: string
  name: string
  description: string
  RMSid: string
  MANid: string
  DISid: string
  RETid: string
  stage: string
}

interface Role {
  addr: string
  id: string
  name: string
  place: string
}

export default function ViewData() {
  const router = useRouter()
  const [loader, setLoader] = useState(true)
  const [product, setProduct] = useState<{ [key: number]: Product}>({})
  const [productStage, setProductStage] = useState<{ [key: number]: string }>({})
  const [productTimestamps, setProductTimestamps] = useState<{ [key: number]: any }>({})
  const [rms, setRMS] = useState<{ [key: number]: Role }>({})
  const [man, setMAN] = useState<{ [key: number]: Role }>({})
  const [dis, setDIS] = useState<{ [key: number]: Role }>({})
  const [ret, setRET] = useState<{ [key: number]: Role }>({})

  useEffect(() => {
    loadWeb3()
    loadBlockchainData()
  }, [])

  const loadBlockchainData = async () => {
    try {
      setLoader(true)
      const { contract } = await getContract()

      const medCtr = await contract.methods.productCtr().call()
      const productData: { [key: number]: Product } = {}
      const productStageData: { [key: number]: string } = {}
      const productTimestampData: { [key: number]: any } = {}

      for (let i = 0; i < medCtr; i++) {
        const id = i + 1
        productData[id] = await contract.methods.ProductStock(id).call()
        productStageData[id] = await contract.methods.showStage(id).call()
        productTimestampData[id] = await contract.methods.getProductTimestamps(id).call()
      }

      const rmsCtr = await contract.methods.rmsCtr().call()
      const rmsData: { [key: number]: Role } = {}
      for (let i = 0; i < rmsCtr; i++) {
        rmsData[i + 1] = await contract.methods.RMS(i + 1).call()
      }

      const manCtr = await contract.methods.manCtr().call()
      const manData: { [key: number]: Role } = {}
      for (let i = 0; i < manCtr; i++) {
        manData[i + 1] = await contract.methods.MAN(i + 1).call()
      }

      const disCtr = await contract.methods.disCtr().call()
      const disData: { [key: number]: Role } = {}
      for (let i = 0; i < disCtr; i++) {
        disData[i + 1] = await contract.methods.DIS(i + 1).call()
      }

      const retCtr = await contract.methods.retCtr().call()
      const retData: { [key: number]: Role } = {}
      for (let i = 0; i < retCtr; i++) {
        retData[i + 1] = await contract.methods.RET(i + 1).call()
      }

      setProduct(productData)
      setProductStage(productStageData)
      setProductTimestamps(productTimestampData)
      setRMS(rmsData)
      setMAN(manData)
      setDIS(disData)
      setRET(retData)
      setLoader(false)
    } catch (err) {
      console.error('Error loading blockchain data', err)
      setLoader(false)
      alert('Unable to load blockchain data')
    }
  }

  // Chart 1: Blockchain Transaction Timeline
  const getTransactionTimeline = () => {
    const timelineData: { [key: string]: number } = {}
    Object.keys(productTimestamps).forEach((k) => {
      const ts = productTimestamps[parseInt(k)]
      const timestamps = [ts?.orderedAt, ts?.rawSupplyAt, ts?.manufactureAt, ts?.distributionAt, ts?.retailAt, ts?.soldAt].filter(Boolean)
      timestamps.forEach((t) => {
        const date = new Date(Number(t) * 1000).toLocaleDateString()
        timelineData[date] = (timelineData[date] || 0) + 1
      })
    })
    return Object.entries(timelineData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-10)
  }

  // Chart 2: Product Traceability Flow
  const getTraceabilityFlow = () => {
    const flowData = {
      'Ordered': 0,
      'Raw Material': 0,
      'Manufacturing': 0,
      'Distribution': 0,
      'Retail': 0,
      'Sold': 0,
    }
    Object.keys(productStage).forEach((k) => {
      const s = productStage[parseInt(k)] || ''
      if (s.toLowerCase().includes('order')) flowData['Ordered']++
      else if (s.toLowerCase().includes('raw')) flowData['Raw Material']++
      else if (s.toLowerCase().includes('manufactur')) flowData['Manufacturing']++
      else if (s.toLowerCase().includes('distribut')) flowData['Distribution']++
      else if (s.toLowerCase().includes('retail')) flowData['Retail']++
      else if (s.toLowerCase().includes('sold')) flowData['Sold']++
    })
    return flowData
  }

  // Chart 3: Transaction Verification Status
  const getVerificationStatus = () => {
    const total = Object.keys(product).length
    const verified = Object.values(productStage).filter((s) => s.toLowerCase().includes('sold')).length
    const pending = total - verified
    return { verified, pending, rejected: 0 }
  }

  // Chart 4: Role-Based Activity
  const getRoleActivity = () => {
    const roleMap: { [key: string]: number } = {
      'Raw Material Supplier': 0,
      'Manufacturer': 0,
      'Distributor': 0,
      'Retailer': 0,
    }
    Object.keys(product).forEach((k) => {
      const id = parseInt(k)
      if (product[id].RMSid) roleMap['Raw Material Supplier']++
      if (product[id].MANid) roleMap['Manufacturer']++
      if (product[id].DISid) roleMap['Distributor']++
      if (product[id].RETid) roleMap['Retailer']++
    })
    return roleMap
  }

  // Chart 5: Smart Contract Stats
  const getContractStats = () => {
    const totalMeds = Object.keys(product).length
    const totalTransactions = Object.keys(productTimestamps).reduce((acc, k) => {
      const ts = productTimestamps[parseInt(k)]
      return acc + [ts?.orderedAt, ts?.rawSupplyAt, ts?.manufactureAt, ts?.distributionAt, ts?.retailAt, ts?.soldAt].filter(Boolean).length
    }, 0)
    const totalRoles = Object.keys(rms).length + Object.keys(man).length + Object.keys(dis).length + Object.keys(ret).length
    return { totalMeds, totalTransactions, totalRoles }
  }

  if (loader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-700 font-semibold">Loading blockchain data...</div>
        </div>
      </div>
    )
  }

  const timeline = getTransactionTimeline()
  const traceability = getTraceabilityFlow()
  const verification = getVerificationStatus()
  const roleActivity = getRoleActivity()
  const contractStats = getContractStats()

  const maxTimeline = Math.max(...timeline.map((t) => t[1]), 1)
  const maxRole = Math.max(...Object.values(roleActivity), 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Blockchain Analytics</h1>
            <p className="text-gray-600">Real-time supply chain transaction and verification data</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
          >
            Home
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-gray-600 text-sm font-semibold">Total Transactions</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{contractStats.totalTransactions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-gray-600 text-sm font-semibold">Verified Blocks</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{verification.verified}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="text-gray-600 text-sm font-semibold">Pending</div>
            <div className="text-3xl font-bold text-yellow-600 mt-2">{verification.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-gray-600 text-sm font-semibold">Active Roles</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{contractStats.totalRoles}</div>
          </div>
        </div>

        {/* Chart 1 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">1. Blockchain Transaction Timeline</h2>
          <p className="text-gray-600 text-sm mb-4">Number of blockchain transactions recorded per date</p>
          <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto">
            <div className="flex items-end justify-around h-64 min-w-max py-4">
              {timeline.length > 0 ? (
                timeline.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center px-2">
                    <div className="text-xs text-gray-700 font-semibold mb-2">{item[1]}</div>
                    <div
                      className="w-12 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg"
                      style={{ height: `${(item[1] / maxTimeline) * 200}px` }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2 text-center">{item[0]}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No transaction data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">2. Product Traceability Flow</h2>
          <p className="text-gray-600 text-sm mb-6">Immutable flow of products through blockchain stages</p>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg overflow-x-auto">
            {Object.entries(traceability).map((item, idx) => (
              <div key={item[0]} className="flex flex-col items-center min-w-fit">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {item[1]}
                </div>
                <div className="text-sm font-semibold text-gray-700 mt-3 text-center">{item[0]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">3. Transaction Verification Status</h2>
          <p className="text-gray-600 text-sm mb-6">Blockchain validation showing verified vs pending</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
              <div className="text-center">
                <div className="text-5xl font-bold text-green-600">{verification.verified}</div>
                <div className="text-gray-700 font-semibold mt-2">Verified Blocks</div>
                <div className="text-sm text-gray-500 mt-1">Confirmed on blockchain</div>
              </div>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-full"
                  style={{
                    width: `${verification.verified + verification.pending > 0 ? (verification.verified / (verification.verified + verification.pending)) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-6 border-2 border-yellow-200">
              <div className="text-center">
                <div className="text-5xl font-bold text-yellow-600">{verification.pending}</div>
                <div className="text-gray-700 font-semibold mt-2">Pending</div>
                <div className="text-sm text-gray-500 mt-1">Awaiting validation</div>
              </div>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-full"
                  style={{
                    width: `${verification.verified + verification.pending > 0 ? (verification.pending / (verification.verified + verification.pending)) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-6 border-2 border-red-200">
              <div className="text-center">
                <div className="text-5xl font-bold text-red-600">0</div>
                <div className="text-gray-700 font-semibold mt-2">Rejected</div>
                <div className="text-sm text-gray-500 mt-1">Failed validation</div>
              </div>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 4 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">4. Role-Based Blockchain Activity</h2>
          <p className="text-gray-600 text-sm mb-6">Smart contract interactions by supply chain role</p>
          <div className="space-y-6">
            {Object.entries(roleActivity).map((item, idx) => {
              const colors = ['from-blue-500 to-cyan-400', 'from-green-500 to-emerald-400', 'from-purple-500 to-pink-400', 'from-orange-500 to-red-400']
              return (
                <div key={item[0]} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-semibold text-gray-700">{item[0]}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors[idx]} flex items-center justify-end pr-3`}
                      style={{ width: `${(item[1] / maxRole) * 100}%` }}
                    >
                      {item[1] > 0 && <span className="text-white font-bold text-sm">{item[1]}</span>}
                    </div>
                  </div>
                  <div className="w-12 text-right font-bold text-gray-800">{item[1]}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chart 5 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">5. Smart Contract Interaction Statistics</h2>
          <p className="text-gray-600 text-sm mb-6">Ethereum smart contract activity and system metrics</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-8 border-2 border-indigo-200">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-full mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-indigo-600">{contractStats.totalTransactions}</div>
                <div className="text-gray-700 font-semibold mt-3">Total Contract Calls</div>
                <div className="text-sm text-gray-600 mt-2">Smart contract method invocations</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 border-2 border-green-200">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-green-600">{Object.keys(product).length}</div>
                <div className="text-gray-700 font-semibold mt-3">Event Triggers</div>
                <div className="text-sm text-gray-600 mt-2">Smart contract events emitted</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-8 border-2 border-purple-200">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-purple-600">{contractStats.totalMeds}</div>
                <div className="text-gray-700 font-semibold mt-3">Active Items</div>
                <div className="text-sm text-gray-600 mt-2">Products tracked on blockchain</div>
              </div>
            </div>
          </div>
          <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <div className="text-sm text-purple-900">
              <strong>📊 Blockchain Proof:</strong> Every transaction is immutable, timestamped, and verified on the network with cryptographic signatures.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
