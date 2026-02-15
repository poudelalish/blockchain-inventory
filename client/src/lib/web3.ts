import Web3 from 'web3'
import { SupplyChainArtifact } from './contracts'

declare global {
  interface Window {
    ethereum?: any
    web3?: Web3
  }
}

let cachedWeb3: Web3 | null = null

export const loadWeb3 = async (): Promise<Web3> => {
  if (cachedWeb3) {
    return cachedWeb3
  }

  if (typeof window === 'undefined') {
    throw new Error('Web3 can only be loaded in browser environment')
  }

  if (!window.ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask.')
  }

  try {
    const web3 = new Web3(window.ethereum)
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    cachedWeb3 = web3
    return web3
  } catch (error: any) {
    throw new Error(`Failed to load Web3: ${error.message}`)
  }
}

export const getContract = async () => {
  console.log('[getContract] Starting...')
  
  try {
    const web3 = await loadWeb3()
    console.log('[getContract] Web3 loaded')

    const accounts = await web3.eth.getAccounts()
    console.log('[getContract] Accounts:', accounts)
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available. Please unlock MetaMask.')
    }

    const chainId = await web3.eth.getChainId()
    console.log('[getContract] Chain ID:', chainId)
    
    // Import deployment info
    const deployments = await import('../deployments.json')
    const chainIdStr = chainId.toString()
    const networkData = deployments.networks[chainIdStr as keyof typeof deployments.networks]

    console.log('[getContract] Available networks:', Object.keys(deployments.networks))
    console.log('[getContract] Looking for network:', chainIdStr)
    console.log('[getContract] Network data:', networkData)

    if (!networkData?.SupplyChain?.address) {
      const availableNetworks = Object.keys(deployments.networks).join(', ')
      throw new Error(
        `Contract not found on network ${chainIdStr}.\n` +
        `Available networks: ${availableNetworks}\n` +
        `Please switch to network ${availableNetworks}`
      )
    }

    const contractAddress = networkData.SupplyChain.address
    console.log('[getContract] Contract address:', contractAddress)

    // Get ABI from artifact
    const artifactAbi = (SupplyChainArtifact as any).abi
    if (!Array.isArray(artifactAbi)) {
      throw new Error('Invalid ABI: not an array')
    }

    console.log('[getContract] ABI loaded, functions:', artifactAbi.filter((a: any) => a.type === 'function').length)

    const contract = new web3.eth.Contract(artifactAbi, contractAddress)
    console.log('[getContract] Contract instance created')
    
    return { contract, account: accounts[0], web3, chainId }
  } catch (error: any) {
    console.error('[getContract] Error:', error)
    throw error
  }
}

export const switchToNetwork = async (chainId: string | number) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  const chainIdHex = `0x${Number(chainId).toString(16)}`
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    })
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      // Try to add the network
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: chainId === '5777' ? 'Ganache Local' : 'Hardhat Local',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: chainId === '5777'
                ? ['http://127.0.0.1:7545'] 
                : ['http://127.0.0.1:8545'],
            },
          ],
        })
      } catch (addError) {
        throw new Error('Failed to add network to MetaMask')
      }
    } else {
      throw switchError
    }
  }
}

