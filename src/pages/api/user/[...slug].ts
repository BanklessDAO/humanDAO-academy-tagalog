/* eslint-disable no-console */
import { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { mainnet } from 'viem/chains'
import { createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'

import kudosBadges from 'data/badges.json'
import { ALCHEMY_KEY_BACKEND, COLLECTIBLE_ADDRESSES, DOMAIN_URL, LESSONS, MIRROR_ARTICLE_ADDRESSES } from 'constants/index'
import { BADGE_ADDRESS, BADGE_IDS, BADGE_API, BADGE_TO_KUDOS_IDS } from 'constants/badges'
import { TABLE, TABLES, db } from 'utils/db'
import { UserStatsType, UserType } from 'entities/user'
import { ALLOWED_PROVIDERS } from 'constants/passport'
import { calculateExplorerScore } from 'utils/index'

async function getBadgeTokensIds(address: string): Promise<number[]> {
  try {
    const badges = await axios.get(
      `${BADGE_API}${ALCHEMY_KEY_BACKEND}/getNFTsForOwner?owner=${address}&contractAddresses[]=${BADGE_ADDRESS}&withMetadata=false&pageSize=100`
    )
    console.log(badges.data)
    const badgeTokenIds = badges.data.ownedNfts
      .map((token) =>
        BADGE_IDS.includes(parseInt(token.tokenId))
          ? parseInt(token.tokenId)
          : null
      )
      .filter((tokenId) => tokenId)
    console.log(badgeTokenIds)
    return badgeTokenIds
  } catch (error) {
    console.error(error)
    return []
  }
}

async function getUserCollectibles(address: string): Promise<{ datadisks: string[], handbooks: string[] }> {
  try {
    const ownerNFTs = await axios.get(
      `https://opt-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY_BACKEND}/getNFTs?owner=${address}&pageSize=100${COLLECTIBLE_ADDRESSES.map(
        (collectibleAddress) => `&contractAddresses[]=${collectibleAddress}`
      ).join('')}${MIRROR_ARTICLE_ADDRESSES.map(
        (articleAddress) => `&contractAddresses[]=${articleAddress}`
      ).join('')}&withMetadata=false`
    )
    const datadisks = []
    const handbooks = []
    if (ownerNFTs.data) {
      // console.log(ownerNFTs.data.ownedNfts)
      for (const nft of ownerNFTs.data.ownedNfts) {
        const datadisk = (LESSONS.find(lesson => lesson.lessonCollectibleTokenAddress?.toLowerCase() === nft.contract.address?.toLowerCase()))?.collectibleId || ''
        if (datadisk) datadisks.push(datadisk)
      }
      for (const nft of ownerNFTs.data.ownedNfts) {
        const handbook = (LESSONS.find(lesson => lesson.mirrorNFTAddress?.toLowerCase() === nft.contract.address?.toLowerCase()))?.collectibleId || ''
        if (handbook) handbooks.push(handbook)
      }
    }
    return { datadisks, handbooks }
  } catch (error) {
    console.error(error)
    return { datadisks: [], handbooks: [] }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const {
    slug: [address],
    profile,
    badges,
  } = req.query
  let addressLowerCase = address.toLowerCase()
  // console.log('address', address)

  const DEFAULT_AVATAR = 'https://app.banklessacademy.com/images/explorer_avatar.png'

  if (!address) return res.status(400).json({ error: 'Wrong params' })

  let userExist = null
  if (address.endsWith('.eth')) {
    // check in DB first
    const [userExist] = await db(TABLES.users)
      .select(
        TABLE.users.id,
        TABLE.users.address,
        TABLE.users.ens_name,
        TABLE.users.ens_avatar,
        TABLE.users.donations,
        TABLE.users.gitcoin_stamps
      )
      .whereILike('ens_name', addressLowerCase)
    // console.log('userExist1', userExist)
    if (userExist) {
      addressLowerCase = userExist.address?.toLowerCase()
    } else {
      const transport = http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_BACKEND}`)
      const client = createPublicClient({
        chain: mainnet,
        transport,
      })
      const fullAddress = await client.getEnsAddress({ name: normalize(addressLowerCase) })
      if (fullAddress) {
        addressLowerCase = fullAddress.toLowerCase()
      } else {
        res.status(400).json({ error: 'Wrong params' })
      }
    }
  }

  if (!userExist) {
    if (addressLowerCase?.length !== 42) {
      return res.status(200).json({ error: 'Profile not found.' })
    }
    [userExist] = await db(TABLES.users)
      .select(
        TABLE.users.id,
        TABLE.users.ens_name,
        TABLE.users.ens_avatar,
        TABLE.users.donations,
        TABLE.users.gitcoin_stamps
      )
      .whereILike('address', addressLowerCase)
    console.log('user', userExist)
    if (!userExist) {
      const emptyUser: UserType = {
        address: addressLowerCase,
        ensName: null,
        avatar: DEFAULT_AVATAR,
        stats: {},
        badgeTokenIds: [],
        kudosTokenIds: [],
      }
      return res.status(200).json(emptyUser)
    }
  }

  const oldBadgeTokenIds = addressLowerCase in kudosBadges ? kudosBadges[addressLowerCase] : []
  console.log(oldBadgeTokenIds)
  const badgeTokenIds = [...new Set([
    ...(await getBadgeTokensIds(addressLowerCase)),
    ...oldBadgeTokenIds
  ])]

  const kudosTokenIds = addressLowerCase in kudosBadges ? kudosBadges[addressLowerCase].map(token => BADGE_TO_KUDOS_IDS[token.toString()]).filter(token => token) : []
  console.log(kudosTokenIds)

  if (badges === 'true') {
    // only return badge details
    const data = {
      address: addressLowerCase,
      badgeTokenIds,
      kudosTokenIds,
    }

    return res.status(200).json(data)
  }

  const ensName = userExist?.ens_name
  // console.log(ensName)

  const avatar = userExist?.ens_avatar || DEFAULT_AVATAR

  if (profile === 'true') {
    // async update ENS (available on next call)
    axios.get(`${DOMAIN_URL}/api/updateENS/${addressLowerCase}`)
  }

  const stats: UserStatsType = {}
  const { datadisks, handbooks } = await getUserCollectibles(addressLowerCase)
  // datadisks
  stats.datadisks = datadisks
  // handbooks
  stats.handbooks = handbooks
  // badges
  stats.badges = badgeTokenIds?.length
  // valid_stamps
  if (userExist.gitcoin_stamps) {
    const stamps = Object.keys(userExist.gitcoin_stamps)
    stats.valid_stamps = ALLOWED_PROVIDERS.filter(value => stamps.includes(value)) || []
  }
  // donations
  stats.donations = userExist.donations
  stats.score = calculateExplorerScore(stats)

  console.log(stats)

  const data: UserType = {
    address: addressLowerCase,
    ensName,
    avatar: avatar || DEFAULT_AVATAR,
    stats,
    badgeTokenIds,
    kudosTokenIds,
  }

  return res.status(200).json(data)
}
