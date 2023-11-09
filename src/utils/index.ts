/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
import { Contract } from '@ethersproject/contracts'
import { getAddress } from '@ethersproject/address'
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers'
import * as ethUtil from 'ethereumjs-util'
import { ethers } from 'ethers'
import { verifyTypedData } from 'ethers/lib/utils'
import { Network } from '@ethersproject/networks'
import queryString from 'query-string'
import mixpanel, { Dict, Query } from 'mixpanel-browser'
import { readContract } from '@wagmi/core'
import axios from 'axios'

import {
  ACTIVATE_MIXPANEL,
  ALCHEMY_KEY,
  ALCHEMY_KEY_BACKEND,
  COLLECTIBLE_ADDRESSES,
  DOMAIN_PROD,
  DOMAIN_URL,
  INFURA_KEY,
  MIRROR_ARTICLE_ADDRESSES,
} from 'constants/index'
import { NETWORKS } from 'constants/networks'
import UDPolygonABI from 'abis/UDPolygon.json'
import UDABI from 'abis/UD.json'
import { LessonType } from 'entities/lesson'

declare global {
  interface Window {
    umami: any
  }
}

// HOW-TO: ?debug=password or ?debug=false to activate/deactivate debug mode
const debugParam =
  typeof window !== 'undefined'
    ? queryString.parse(window.location.search).debug?.toString()
    : undefined
const w = typeof window !== 'undefined' ? localStorage.getItem('debug') : null
export const DEBUG: string = debugParam !== undefined ? debugParam : w
export const IS_DEBUG = debugParam !== undefined && debugParam !== 'false'
if (debugParam !== undefined) localStorage.setItem('debug', DEBUG)
if (debugParam === 'false') localStorage.removeItem('debug')

export function isAddress(value: any): string | false {
  try {
    return getAddress(value)
  } catch {
    return false
  }
}

export function shortenAddress(address: string): string {
  return `${address?.substr(0, 6)}...${address?.substr(38, 4)}`
}

export function getContract(
  address: string,
  ABI: any,
  library: Web3Provider,
  account?: string
): Contract {
  if (!isAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new Contract(
    address,
    ABI,
    getProviderOrSigner(library, account) as any
  )
}

export function getProviderOrSigner(
  library: Web3Provider,
  account?: string
): Web3Provider | JsonRpcSigner {
  return account ? getSigner(library, account) : library
}

export function getSigner(
  library: Web3Provider,
  account: string
): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked()
}

export const toFixed = function (x) {
  if (Math.abs(x) < 1.0) {
    const e = parseInt(x.toString().split('e-')[1])
    if (e) {
      x *= Math.pow(10, e - 1)
      x = '0.' + new Array(e).join('0') + x.toString().substring(2)
    }
  } else {
    let e = parseInt(x.toString().split('+')[1])
    if (e > 20) {
      e -= 20
      x /= Math.pow(10, e)
      x += new Array(e + 1).join('0')
    }
  }
  return x
}

export const track = (event: string, value?: any): void => {
  if (typeof window !== 'undefined') {
    // TODO: change type of event value to JSON instead of varchar(50)
    // window.umami.trackEvent(typeof value === 'object' ? JSON.stringify(value) : value, event)
    window?.umami?.track(
      event,
      typeof value === 'object' ? Object.values(value).join('|') : value
    )
  }
}

export function hashPersonalMessage(msg: string): string {
  const buffer = Buffer.from(msg)
  const result = ethUtil.hashPersonalMessage(buffer)
  const hash = ethUtil.bufferToHex(result)
  return hash
}

export function recoverPublicKey(sig: string, hash: string): string {
  const sigParams = ethUtil.fromRpcSig(sig)
  const hashBuffer = Buffer.from(hash.replace('0x', ''), 'hex')
  const result = ethUtil.ecrecover(
    hashBuffer,
    sigParams.v,
    sigParams.r,
    sigParams.s
  )
  const signer = ethUtil.bufferToHex(ethUtil.publicToAddress(result))
  return signer
}

export function recoverPersonalSignature(sig: string, msg: string): string {
  const hash = hashPersonalMessage(msg)
  const signer = recoverPublicKey(sig, hash)
  return signer
}

export function verifySignature(
  address: string,
  signature: string,
  message: string
): boolean {
  try {
    const signer = recoverPersonalSignature(signature, message)
    return signer.toLowerCase() === address.toLowerCase()
  } catch (error) {
    console.error(error)
    return false
  }
}

export async function getSignature(
  library: Web3Provider,
  address: string,
  message: string
): Promise<string> {
  const signature = await library.send('personal_sign', [
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message)),
    address.toLowerCase(),
  ])
  return signature
}

export const verifyTypedSignature = (
  signature,
  message,
  address,
  types,
  domain
): boolean => {
  return (
    verifyTypedData(domain, types, message, signature).toLowerCase() ===
    address.toLowerCase()
  )
}

export async function validateOnchainQuest(
  quest: string,
  address: string,
  tx?: string
): Promise<boolean> {
  try {
    if (quest === 'DEXAggregators') {
      const check = []
      const matic: Network = {
        name: 'matic',
        chainId: NETWORKS['matic'].chainId,
        _defaultProvider: (providers) =>
          new providers.JsonRpcProvider(
            `${NETWORKS['matic'].infuraRpcUrl}${INFURA_KEY}`
          ),
      }
      const provider = ethers.getDefaultProvider(matic)
      const receipt = await provider.waitForTransaction(tx, 2)
      // console.log('receipt', receipt.status)
      if (receipt?.status) {
        check.push(true)
        console.log('OK tx status confirmed')
        const txDetails = await provider.getTransaction(tx)
        // console.log('txDetails', txDetails)
        if (txDetails) {
          if (txDetails.data.includes(address.toLowerCase().substring(2))) {
            check.push(true)
            console.log('OK wallet interaction')
          }
          // 1inch v4 router contract
          const address1inchV4 =
            '0x1111111254fb6c44bac0bed2854e76f90643097d'.toLowerCase()
          // 1inch v5 router contract
          const address1inchV5 =
            '0x1111111254EEB25477B68fb85Ed929f73A960582'.toLowerCase()
          // 1inch Liquidity Pool
          const address1inchLP =
            '0x8Acdb3bcC5101b1Ba8a5070F003a77A2da376fe8'.toLowerCase()
          if (
            [address1inchV4, address1inchV5, address1inchLP].includes(
              txDetails.to.toLowerCase()
            ) ||
            txDetails.data.includes(address1inchV4.substring(2)) ||
            txDetails.data.includes(address1inchV5.substring(2)) ||
            txDetails.data.includes(address1inchLP.substring(2))
          ) {
            check.push(true)
            console.log('OK 1inch router contract interaction')
          }
        }
      }
      console.log('checks validated (3)', check.length)
      return check.length === 3
    }
    else if (quest === 'DecentralizedExchanges') {
      const check = []
      const optimism: Network = {
        name: 'optimism',
        chainId: NETWORKS['optimism'].chainId,
        _defaultProvider: (providers) =>
          new providers.JsonRpcProvider(
            // `${NETWORKS['optimism'].infuraRpcUrl}${INFURA_KEY}`
            `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_BACKEND}`
          ),
      }
      const provider = ethers.getDefaultProvider(optimism)
      const receipt = await provider.waitForTransaction(tx, 2)
      // console.log('receipt', receipt.status)
      if (receipt?.status) {
        check.push(true)
        console.log('OK tx status confirmed')
        const txDetails = await provider.getTransaction(tx)
        // console.log('txDetails', txDetails)
        if (txDetails) {
          if (txDetails.data.includes(address.toLowerCase().substring(2))) {
            check.push(true)
            console.log('OK wallet interaction')
          }
          // Velodrome v1 router contract
          const velodromeRouterV1 =
            '0x9c12939390052919af3155f41bf4160fd3666a6f'.toLowerCase()
          // Velodrome v2 router contract
          const velodromeRouterV2 =
            '0xa062ae8a9c5e11aaa026fc2670b0d65ccc8b2858'.toLowerCase()
          if (
            [velodromeRouterV1, velodromeRouterV2].includes(
              txDetails.to.toLowerCase()
            ) ||
            txDetails.data.includes(velodromeRouterV1.substring(2)) ||
            txDetails.data.includes(velodromeRouterV2.substring(2))
          ) {
            check.push(true)
            console.log('OK Velodrome router contract interaction')
          }
        }
      }
      console.log('checks validated (3)', check.length)
      return check.length === 3
    }
    else if (quest === 'Layer2Blockchains') {
      const optimism: Network = {
        name: 'optimism',
        chainId: NETWORKS['optimism'].chainId,
        _defaultProvider: (providers) =>
          new providers.JsonRpcProvider(
            // `${NETWORKS['optimism'].infuraRpcUrl}${INFURA_KEY}`
            `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_BACKEND}`
          ),
      }
      const provider = ethers.getDefaultProvider(optimism)
      const bigNumberBalance = await provider.getBalance(address.toLowerCase())
      const balance = parseFloat(ethers.utils.formatEther(bigNumberBalance))
      console.log('balance: ', balance)
      return balance >= 0.001
    }
    else if (quest === 'OptimismGovernance') {
      const optimism: Network = {
        name: 'optimism',
        chainId: NETWORKS['optimism'].chainId,
        _defaultProvider: (providers) =>
          new providers.JsonRpcProvider(
            // `${NETWORKS['optimism'].infuraRpcUrl}${INFURA_KEY}`
            `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_BACKEND}`
          ),
      }
      const provider = ethers.getDefaultProvider(optimism)
      const contract = new ethers.Contract('0x4200000000000000000000000000000000000042', [
        {
          "inputs": [
            { "internalType": "address", "name": "account", "type": "address" }
          ],
          "name": "delegates",
          "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
          "stateMutability": "view",
          "type": "function"
        },
      ], provider)
      const delegate = await contract['delegates(address)'](address.toLowerCase())
      console.log('delegate', delegate)
      return delegate?.length === 42 && delegate !== '0x0000000000000000000000000000000000000000'
    }
    return false
  } catch (error) {
    console.error(error)
    return false
  }
}

// TODO: remove debug
if (ACTIVATE_MIXPANEL) {
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_ID, {
    api_host: '/mp',
    debug: true,
  })
}

export const mixpanel_distinct_id = ACTIVATE_MIXPANEL
  ? mixpanel.get_distinct_id()
  : null

const withMixpanel = {
  identify: (id: string) => {
    mixpanel.identify(id)
  },
  alias: (id: string) => {
    mixpanel.alias(id)
  },
  track: (event_name: string, props?: Dict) => {
    const wallets = {
      wallets: localStorage.getItem('wallets')
        ? JSON.parse(localStorage.getItem('wallets'))
        : [],
    }
    const current_wallet = localStorage.getItem('current_wallet')
    if (current_wallet) {
      const mp_current_wallet = localStorage.getItem(`mp_${current_wallet}`)
      if (!mp_current_wallet?.length) {
        mixpanel.alias(current_wallet)
        mixpanel.people.set({ name: current_wallet, wallets })
        localStorage.setItem(`mp_${current_wallet}`, mixpanel_distinct_id)
      }
    }
    const embed = localStorage.getItem('embed')
    if (embed && embed.length) {
      props.embed = embed
    }
    const i18nextLng = localStorage.getItem('i18nextLng')
    if (!props.language && i18nextLng?.length) {
      props.language = i18nextLng
    }
    mixpanel.track(event_name, { domain: DOMAIN_PROD, ...props })
  },
  track_links: (query: Query, name: string) => {
    mixpanel.track_links(query, name, {
      referrer: document.referrer,
    })
  },
  people: {
    set: (props: Dict) => {
      mixpanel.people.set(props)
    },
  },
}

const withoutMixpanel = {
  identify: (id: string) => {
    console.log(id)
  },
  alias: (id: string) => {
    console.log(id)
  },
  track: (event_name: string, props?: Dict) => {
    console.log(event_name)
    console.log(props)
  },
  track_links: (query: Query, name: string) => {
    console.log(query)
    console.log(name)
  },
  people: {
    set: (props: Dict) => {
      console.log(props)
    },
  },
}

export const Mixpanel = ACTIVATE_MIXPANEL ? withMixpanel : withoutMixpanel

export const getNodeText = (node) => {
  if (['string', 'number'].includes(typeof node)) return node
  if (node instanceof Array) return node.map(getNodeText).join('')
  if (typeof node === 'object' && node) return getNodeText(node.props.children)
}

export async function api(
  url: string,
  data: any
): Promise<{ data: any; status: number }> {
  const wrong = {
    data: {},
    status: 500,
  }
  const embed =
    typeof localStorage !== 'undefined' ? localStorage.getItem('embed') : null
  if (embed && embed.length) {
    data.embed = embed
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = `An error occured: ${response.status}`
    console.error(error)
    if (response.status !== 500) {
      const d = await response.json()
      wrong.data = d
      wrong.status = response.status
    } else {
      wrong.data = { status: 'API error' }
    }
    return wrong
  }
  const d = await response.json()
  const r = { status: response.status, data: d }
  console.log('API OK', r)
  return r
}

export async function getArticlesCollected(address: string): Promise<string[]> {
  try {
    const ownerNFTs = await axios.get(
      `https://opt-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}/getNFTs?owner=${address}&pageSize=100${MIRROR_ARTICLE_ADDRESSES.map(
        (articleAddress) => `&contractAddresses[]=${articleAddress}`
      ).join('')}&withMetadata=false`
    )
    if (ownerNFTs.data) {
      // console.log(ownerNFTs.data?.ownedNfts)
      const articlesCollected = ownerNFTs.data?.ownedNfts.map(
        (nft) => nft.contract.address
      )
      // console.log(articlesCollected)
      return articlesCollected
    } else {
      return []
    }
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getLessonsCollected(address: string): Promise<string[]> {
  try {
    const ownerNFTs = await axios.get(
      `https://opt-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}/getNFTs?owner=${address}&pageSize=100${COLLECTIBLE_ADDRESSES.map(
        (collectibleAddress) => `&contractAddresses[]=${collectibleAddress}`
      ).join('')}&withMetadata=false`
    )
    if (ownerNFTs.data) {
      // console.log(ownerNFTs.data?.ownedNfts)
      const lessonsCollected = ownerNFTs.data?.ownedNfts.map(
        (nft) => nft.contract.address
      )
      // console.log(articlesCollected)
      return lessonsCollected
    } else {
      return []
    }
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getLessonsCollectors(
  collectibleAddress: string
): Promise<any[]> {
  try {
    const NFTCollectors = await axios.get(
      `https://opt-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}/getOwnersForCollection?contractAddress=${collectibleAddress}&withTokenBalances=true`
    )
    // console.log(NFTCollectors.data)
    return NFTCollectors.data?.ownerAddresses || []
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getArticlesCollectors(
  articleAddress: string
): Promise<any[]> {
  try {
    const NFTCollectors = await axios.get(
      `https://opt-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}/getOwnersForCollection?contractAddress=${articleAddress}&withTokenBalances=true`
    )
    // console.log(NFTCollectors.data)
    return NFTCollectors.data?.ownerAddresses || []
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function isHolderOfNFT(
  address: string,
  openSeaLink: string
): Promise<boolean> {
  try {
    const nftAddress = openSeaLink.replace(
      'https://opensea.io/assets/matic/',
      ''
    )
    const [contractAddress, tokenId] = nftAddress.split('/')
    // console.log(contractAddress)
    // console.log(tokenId)
    const ownerNFTs = await axios.get(
      `https://polygon-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}/getNFTs?owner=${address}&pageSize=100&contractAddresses[]=${contractAddress}&withMetadata=false`
    )
    if (ownerNFTs.data) {
      return (
        ownerNFTs.data?.ownedNfts.filter(
          (nft) => parseInt(nft.id.tokenId, 16).toString() === tokenId
        ).length > 0
      )
    } else {
      return false
    }
  } catch (error) {
    console.error(error)
    return false
  }
}

export async function getLensProfile(address: string): Promise<{
  name: string | null
  avatar: string | null
}> {
  const res = {
    name: null,
    avatar: null,
  }
  try {
    const data =
      '{"operationName":"DefaultProfile","variables":{},"query":"query DefaultProfile {\\n  defaultProfile(\\n    request: {ethereumAddress: \\"' +
      address +
      '\\"}\\n  ) {\\n    id\\n    handle\\n    picture {\\n      ... on NftImage {\\n        uri\\n      }\\n      ... on MediaSet {\\n        original {\\n          url\\n        }\\n      }\\n    }\\n  }\\n}\\n"}'
    const config = {
      headers: {
        'content-type': 'application/json',
      },
    }
    const r = await axios.post('https://api.lens.dev/', data, config)
    const profile = r?.data?.data?.defaultProfile
    res.name = profile?.handle
    const picture =
      profile?.picture?.uri || profile?.picture?.original?.url || null
    res.avatar = picture?.includes('ipfs://')
      ? `https://gateway.ipfscdn.io/ipfs/${picture?.replace('ipfs://', '')}`
      : picture
    return res
  } catch (error) {
    console.error(error)
    return res
  }
}

export async function getUD(address: string): Promise<string | null> {
  let res = null
  try {
    const balanceOfUDPolygon: any = await readContract({
      address: '0xa9a6a3626993d487d2dbda3173cf58ca1a9d9e9f',
      chainId: 137,
      abi: UDPolygonABI,
      functionName: 'balanceOf',
      args: [address],
    })
    // console.log('balanceOfUDPolygon', parseInt(balanceOfUDPolygon))
    const balanceOfUD: any = await readContract({
      address: '0x049aba7510f45ba5b64ea9e658e342f904db358d',
      chainId: 1,
      abi: UDABI,
      functionName: 'balanceOf',
      args: [address],
    })
    // console.log('balanceOfUD', parseInt(balanceOfUD))
    if (parseInt(balanceOfUDPolygon) > 0 || parseInt(balanceOfUD) > 0) {
      // console.log('owns a UD')
      const {
        data: { domain },
      }: any = await api('/api/ud', { address })
      if (domain?.length) {
        // console.log(domain)
        res = domain
      }
    } else {
      // console.log(console.log('NO UD'))
    }
    return res
  } catch (error) {
    console.error(error)
    return res
  }
}

export const scrollTop = () => {
  // 0.3 second delay
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, 300)
}

export const lessonLink = (lesson: LessonType) => {
  return `${DOMAIN_URL}/lessons/${lesson.slug}`
}
