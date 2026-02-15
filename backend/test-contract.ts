import { ethers } from 'hardhat'
import * as fs from 'fs'

async function main() {
  console.log('Testing SupplyChain Contract...')

  const provider = ethers.provider
  const network = await provider.getNetwork()
  console.log('Network Chain ID:', network.chainId)

  // Load deployments
  const deploymentsPath = '../client/src/deployments.json'
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'))
  const chainId = network.chainId.toString()

  if (!deployments.networks[chainId]) {
    console.error(`No deployment found for chain ${chainId}`)
    console.log('Available chains:', Object.keys(deployments.networks))
    return
  }

  const contractAddress = deployments.networks[chainId].SupplyChain.address
  console.log('Contract Address:', contractAddress)

  // Get contract ABI
  const SupplyChainArtifact = JSON.parse(
    fs.readFileSync('../client/src/artifacts/contracts/SupplyChain.sol/SupplyChain.json', 'utf8')
  )
  const abi = SupplyChainArtifact.abi

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, abi, provider)

  // Test read-only methods
  try {
    console.log('\n--- Testing getter methods ---')
    const productCtr = await contract.productCtr()
    console.log('✓ productCtr:', productCtr.toString())

    const rmsCtr = await contract.rmsCtr()
    console.log('✓ rmsCtr:', rmsCtr.toString())

    const manCtr = await contract.manCtr()
    console.log('✓ manCtr:', manCtr.toString())

    const disCtr = await contract.disCtr()
    console.log('✓ disCtr:', disCtr.toString())

    const retCtr = await contract.retCtr()
    console.log('✓ retCtr:', retCtr.toString())

    console.log('\n✅ All getter methods work correctly!')
  } catch (error: any) {
    console.error('\n❌ Error calling getter methods:')
    console.error(error.message)
    console.error(error)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
