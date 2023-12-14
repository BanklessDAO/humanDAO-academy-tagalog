import { MAX_BADGES } from 'constants/badges'
import { MAX_DONATIONS } from 'constants/donations'
import { DOMAIN_URL, MAX_COLLECTIBLES } from 'constants/index'
import { MAX_STAMPS } from 'constants/passport'

const DEFAULT_IMAGE =
  'https://app.banklessacademy.com/images/explorer_avatar.png'

const DEFAULT_NAME = 'banklessexplorer.eth'

const DEFAULT_SCORE = 16

const Skill = ({ skill, score, max }) => (
  <div
    style={{
      display: 'flex',
      marginTop: '24px',
      width: '100%',
      height: '40px',
      justifyContent: 'flex-end',
      position: 'relative',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '20px',
        height: '40px',
        color: '#FFFFFF',
      }}
    >
      {score}
    </div>
    <div
      style={{
        display: 'flex',
        width: `${(score / max) * 230}px`,
        height: '40px',
        background:
          'linear-gradient(135.91deg, #634c70 29.97%, #3a355a 99.26%)',
        borderBottomLeftRadius: '2px',
        borderTopLeftRadius: '2px',
      }}
    />
    <div
      style={{
        display: 'flex',
        width: '200px',
        justifyContent: 'center',
        alignItems: 'center',
        height: '40px',
        border: '2px solid #8a68a2',
        borderLeft: '0',
        backgroundColor: 'transparent',
        borderTopRightRadius: '2px',
        borderBottomRightRadius: '2px',
        textTransform: 'uppercase',
        paddingBottom: '2px',
        color: '#D6D6D6',
      }}
    >
      {skill}
    </div>
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        top: '-5px',
        height: '50px',
        right: '199px',
        borderRight: '1px #989898 solid',
      }}
    />
  </div>
)

const Skills = ({ stats }) => (
  <div
    style={{
      display: 'flex',
      position: 'relative',
      width: '550px',
      height: '258px',
      marginTop: '4px',
      flexWrap: 'wrap',
    }}
  >
    <Skill skill="Badges" score={stats?.badges || 0} max={MAX_BADGES} />
    <Skill
      skill="Collectibles"
      score={
        3 * (stats?.datadisks?.length || 0) + (stats?.handbooks?.length || 0)
      }
      max={MAX_COLLECTIBLES}
    />
    <Skill
      skill="Donations"
      score={stats?.donations ? Object.keys(stats?.donations)?.length || 0 : 0}
      max={MAX_DONATIONS}
    />
    <Skill
      skill="Stamps"
      score={
        stats?.valid_stamps ? Object.keys(stats?.valid_stamps)?.length || 0 : 0
      }
      max={MAX_STAMPS}
    />
  </div>
)

const OgSocial = ({
  explorerName,
  explorerAvatar,
  score,
  stats,
  badgeImageLink,
}: {
  explorerName?: string
  explorerAvatar?: string
  score?: number
  stats?: {
    badges?: number
    datadisks?: string[]
    handbooks?: string[]
    donations?: any
  }
  badgeImageLink?: string
}): React.ReactElement => {
  const profileSocialBackground = `${DOMAIN_URL}/images/profileSocialBackground.png?f=3`
  const badgeSocialBackground = `${DOMAIN_URL}/images/badgeSocialBackground.png?f=3`

  return (
    <>
      <img
        style={{
          display: 'flex',
          position: 'absolute',
          width: '1200px',
          height: '628px',
        }}
        src={badgeImageLink ? badgeSocialBackground : profileSocialBackground}
      />
      <img
        style={{
          display: 'flex',
          position: 'absolute',
          backgroundColor: 'black',
          top: '94px',
          left: '97px',
          width: '312px',
          height: '312px',
          borderRadius: '50%',
        }}
        width="312px"
        height="312px"
        src={explorerAvatar || DEFAULT_IMAGE}
      />
      {!badgeImageLink && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '165px',
            left: '969px',
            width: '102px',
            height: '63px',
            fontSize: 63,
            fontFamily: 'ClearSans',
            color: '#D6D6D6',
            textAlign: 'center',
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: '8px',
          }}
        >
          {score >= 0 ? score : DEFAULT_SCORE}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: '432px',
          left: '32px',
          width: '433px',
          height: '119px',
          fontSize: 40,
          fontFamily: 'ClearSans',
          color: '#FFFFFF',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
          textTransform: 'uppercase',
        }}
      >
        {explorerName || DEFAULT_NAME}
      </div>
      {badgeImageLink ? (
        <img
          style={{
            display: 'flex',
            position: 'absolute',
            top: '80px',
            left: '691px',
            width: '345px',
            height: '345px',
            borderRadius: '50%',
          }}
          src={badgeImageLink}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '300px',
            left: '568px',
            width: '550px',
            height: '258px',
            fontSize: 20,
            fontFamily: 'ClearSans',
            color: 'white',
          }}
        >
          <Skills stats={stats} />
        </div>
      )}
    </>
  )
}

export default OgSocial
