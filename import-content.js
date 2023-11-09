/* eslint-disable no-useless-escape */
/* eslint-disable no-unreachable */
/* eslint-disable no-console */
require('dotenv').config()
const jsdom = require('jsdom')
const { JSDOM } = jsdom
const axios = require('axios')
const knex = require('knex')
const fs = require('fs')
const crc32 = require('js-crc').crc32
const stringifyObject = require('stringify-object')
const { Client } = require("@notionhq/client")
const { NotionToMarkdown } = require("notion-to-md")

const config = require('./knexfile.js')
const db = knex(config)
const { TABLES } = require('./db.js')

const MD_ENABLED = process.env.NEXT_PUBLIC_MD_ENABLED || false

const notion = new Client({
  auth: process.env.NOTION_SECRET,
})

const n2m = new NotionToMarkdown({ notionClient: notion })

// types of blocs to ignore
// BlockType https://github.com/souvikinator/notion-to-md/blob/master/src/types/index.ts
const blockTypesToIgnore = [
  // "image",
  "video",
  "file",
  "pdf",
  "table",
  "bookmark",
  "embed",
  "equation",
  // "divider",
  "toggle",
  // "to_do",
  "synced_block",
  "column_list",
  "column",
  "link_preview",
  // "link_to_page",
  // "paragraph",
  // "heading_1",
  // "heading_2",
  "heading_3",
  // "bulleted_list_item",
  // "numbered_list_item",
  // "quote",
  "template",
  "child_page",
  "child_database",
  "code",
  "callout",
  "breadcrumb",
  "table_of_contents",
  "audio",
  "unsupported"
]
for (const blockType of blockTypesToIgnore) {
  n2m.setCustomTransformer(blockType, async () => {
    return ""
  })
}

n2m.setCustomTransformer("image", async (b) => {
  // console.log(b)
  return `![](https://www.notion.so/image/${encodeURIComponent(b?.image?.file?.url?.split('?')[0].replace('https://s3.', 'https://s3-'))}?table=block&id=${b?.id})`
})

// const PROTOCOL_VERSION = "0.01"

const LESSON_SPLITTER = `\`\`\`

---`

// LAST UPDATED: ${new Date().toLocaleDateString('en-GB')}
// PROTOCOL VERSION: ${PROTOCOL_VERSION}

const mdHeader = (lesson, format) => `---
TITLE: ${lesson.name}
DESCRIPTION: ${lesson.description}
LANGUAGE: English
WRITERS: ${lesson.lessonWriters || ''}
TRANSLATORS: X
LINK: https://app.banklessacademy.com/lessons/${lesson.slug}
FORMAT: ${format}
---

\`\`\`
__________________________________________________________________________________________________________________________________________________________

$$$$$$$\\                      $$\\       $$\\                                      $$$$$$\\                           $$\\                                   
$$  __$$\\                     $$ |      $$ |                                    $$  __$$\\                          $$ |                                  
$$ |  $$ | $$$$$$\\  $$$$$$$\\  $$ |  $$\\ $$ | $$$$$$\\   $$$$$$$\\  $$$$$$$\\       $$ /  $$ | $$$$$$$\\ $$$$$$\\   $$$$$$$ | $$$$$$\\  $$$$$$\\$$$$\\  $$\\   $$\\ 
$$$$$$$\\ | \\____$$\\ $$  __$$\\ $$ | $$  |$$ |$$  __$$\\ $$  _____|$$  _____|      $$$$$$$$ |$$  _____|\\____$$\\ $$  __$$ |$$  __$$\\ $$  _$$  _$$\\ $$ |  $$ |
$$  __$$\\  $$$$$$$ |$$ |  $$ |$$$$$$  / $$ |$$$$$$$$ |\\$$$$$$\\  \\$$$$$$\\        $$  __$$ |$$ /      $$$$$$$ |$$ /  $$ |$$$$$$$$ |$$ / $$ / $$ |$$ |  $$ |
$$ |  $$ |$$  __$$ |$$ |  $$ |$$  _$$<  $$ |$$   ____| \\____$$\\  \\____$$\\       $$ |  $$ |$$ |     $$  __$$ |$$ |  $$ |$$   ____|$$ | $$ | $$ |$$ |  $$ |
$$$$$$$  |\\$$$$$$$ |$$ |  $$ |$$ | \\$$\\ $$ |\\$$$$$$$\\ $$$$$$$  |$$$$$$$  |      $$ |  $$ |\\$$$$$$$\\\\$$$$$$$ |\\$$$$$$$ |\\$$$$$$$\\ $$ | $$ | $$ |\\$$$$$$$ |
\\_______/  \\_______|\\__|  \\__|\\__|  \\__|\\__| \\_______|\\_______/ \\_______/       \\__|  \\__| \\_______|\\_______| \\_______| \\_______|\\__| \\__| \\__| \\____$$ |
                                                                                                                                               $$\\   $$ |
PORTABLE LESSON DATADISK COLLECTION                                                                                                            \\$$$$$$  |
                                                                                                                                                \\______/
__________________________________________________________________________________________________________________________________________________________
${LESSON_SPLITTER}
`

const PROJECT_DIR = process.env.PROJECT_DIR || ''
const IS_WHITELABEL = PROJECT_DIR !== ''
const LESSON_FILENAME = IS_WHITELABEL ? 'whitelabel_lessons' : 'lessons'
const DEFAULT_NOTION_ID = '1dd77eb6ed4147f6bdfd6f23a30baa46'
const POTION_API = 'https://potion.banklessacademy.com'

const KEY_MATCHING = {
  'Kudos image': 'badgeImageLink',
  'Lesson image': 'lessonImageLink',
  'Lesson collected image': 'lessonCollectedImageLink',
  'Lesson collectible gif': 'lessonCollectibleGif',
  'Lesson collectible video': 'lessonCollectibleVideo',
  'Lesson collectible mint ID': 'lessonCollectibleMintID',
  'Lesson collectible token address': 'lessonCollectibleTokenAddress',
  'Social image': 'socialImageLink',
  'What will you be able to do after this lesson?': 'learningActions',
  'Landing page copy': 'marketingDescription',
  'Badge ID': 'badgeId',
  'Duration in minutes': 'duration',
  'What will you learn from this?': 'learnings',
  Difficulty: 'difficulty',
  Description: 'description',
  Name: 'name',
  'Languages': 'languages',
  'Lesson Writers': 'lessonWriters',
  Module: 'moduleId',
  Quest: 'quest',
  'Publication status': 'publicationStatus',
  'Publication Date': 'publicationDate',
  'Featured order on homepage': 'featuredOrderOnHomepage',
  'Enable Comments': 'isCommentsEnabled',
  'End of Lesson redirect': 'endOfLessonRedirect',
  'End of Lesson text': 'endOfLessonText',
  // 'Community discussion link': 'communityDiscussionLink',
  'Mirror link': 'mirrorLink',
  'Mirror NFT address': 'mirrorNFTAddress',
  'Mirror NFT all collected': 'areMirrorNFTAllCollected',
  'Sponsor Name': 'sponsorName',
  'Sponsor Logo': 'sponsorLogo',
  'NFT Gating': 'nftGating',
  'NFT Gating Requirements': 'nftGatingRequirements',
  'NFT Gating Image': 'nftGatingImageLink',
  'NFT Gating Link': 'nftGatingLink',
  'NFT Gating CTA': 'nftGatingCTA',
}

const args = process.argv
const NOTION_ID = args[2] && args[2].length === 32 ? args[2] : process.env.DEFAULT_CONTENT_DB_ID || DEFAULT_NOTION_ID
console.log('NOTION_ID', NOTION_ID)
const LESSON_NOTION_ID = args.includes('-n') ? args.join(' ').split(' ').pop() : null
console.log('LESSON_NOTION_ID', LESSON_NOTION_ID)
const TRANSLATION_ONLY = args.includes('-tr')
const NO_TRANSLATION = args.includes('-notr')

const slugify = (text) => text.toLowerCase()
  .replace('á', 'a')
  .replace(/<[^>]*>?/gm, '') // remove tags
  .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
  .replace(/\s+/g, '-') // collapse whitespace and replace by -
  .replace(/-+/g, '-') // collapse dashes

const get_img = (imageLink, slug, image_name) => {
  const [file_name] = imageLink.split('?')
  const file_extension = (file_name.match(/\.(png|svg|jpg|jpeg|webp|webm|mp4|gif)/))?.[1].replace('jpeg', 'jpg') || 'png'
  // console.log(file_extension)
  // create "unique" hash based on Notion imageLink (different when re-uploaded)
  const hash = crc32(file_name)
  const image_dir = `/${PROJECT_DIR}images/${slug}`
  const local_image_dir = `public${image_dir}`
  // create image directory dynamically in case it doesn't exist yet
  if (!fs.existsSync(local_image_dir)) {
    fs.mkdirSync(local_image_dir)
  }
  const image_path = `${image_dir}/${slugify(image_name)}-${hash}.${file_extension}`
  // console.log('image_path', image_path)
  const local_image_path = `public${image_path}`
  if (!fs.existsSync(local_image_path)) {
    download_image(imageLink, local_image_path)
    console.log('downloading image: ', local_image_path)
  }
  return image_path
}

const download_image = (url, image_path) =>
  axios({
    url,
    responseType: 'stream',
  }).then(function (response) {
    response.data.pipe(fs.createWriteStream(image_path))
  })

const placeholder = (lesson, size, image_name) => {
  const placeholder_link = `https://placehold.co/${size}/4b4665/FFFFFF/png?text=${lesson.name.replaceAll(' ', '+')}`
  return get_img(placeholder_link, lesson.slug, image_name)
}

const importTranslations = async (lesson) => {
  if (NO_TRANSLATION) return
  for (const language of lesson.languages) {
    console.log('import translation:', language)
    try {
      const random = Math.floor(Math.random() * 100000)
      const crowdinFile = `https://raw.githubusercontent.com/bankless-academy/bankless-academy/l10n_main/translation/lesson/${language}/${lesson.slug}.md?${random}`
      // console.log(crowdinFile)
      const crowdin = await axios.get(crowdinFile)
      // console.log(crowdin)
      if (crowdin.status === 200) {
        // const newTranslation = crowdin.data.replace(/LAST UPDATED\: (.*?)\n/, `LAST_UPDATED\n`)
        const newTranslation = crowdin.data
        const [, title, description] = crowdin.data.match(/---\nTITLE:\s(.*?)\nDESCRIPTION:\s(.*?)\n/)
        // console.log('title', title)
        // console.log('description', description)
        const lessonInfoPath = `translation/website/${language}/lesson.json`
        const lessonInfo = fs.existsSync(lessonInfoPath) ? await fs.promises.readFile(lessonInfoPath, 'utf8') : '{}'
        const translationInfo = {}
        translationInfo[lesson.name] = title
        translationInfo[lesson.description] = description
        // console.log('translationInfo', translationInfo)
        const jsonLessonInfo = { ...JSON.parse(lessonInfo), ...translationInfo }
        // console.log('jsonLessonInfo', jsonLessonInfo)
        fs.writeFile(lessonInfoPath, `${JSON.stringify(jsonLessonInfo, null, 2)}`, (error) => {
          if (error) throw error
        })
        // console.log(newTranslation)
        const lessonPath = `translation/lesson/${language}/${lesson.slug}.md`
        const existingTranslation = fs.existsSync(lessonPath) ? await fs.promises.readFile(lessonPath, 'utf8') : ''
        // console.log(existingTranslation)
        // check if translation has been modified
        if (newTranslation.trim() !== existingTranslation.trim()) {
          console.log('- new translation available')
          fs.writeFile(lessonPath, `${newTranslation}`, (error) => {
            if (error) throw error
          })
        } else {
          console.log('- same same')
        }
      }
    } catch (error) {

      console.log(`- ${language} not available yet`)
    }
  }
}

axios
  .get(`${POTION_API}/table?id=${NOTION_ID}`)
  .then((notionRows) => {
    console.log('Notion DB link: ', `${POTION_API}/table?id=${NOTION_ID}`)
    const lessons = []
    if (IS_WHITELABEL && !fs.existsSync(`public/${PROJECT_DIR}lesson`)) {
      // create image directory dynamically in case it doesn't exist yet
      fs.mkdirSync(`public/${PROJECT_DIR}lesson`)
    }
    const promiseArray = notionRows.data.map(async (notion, index) => {
      // DEV_MODE: only test first lesson
      // if (index > 1) return

      // replace keys
      const lesson = Object.keys(KEY_MATCHING).reduce(
        (obj, k) =>
          Object.assign(obj, {
            // transform to number if the string contains a number
            [KEY_MATCHING[k]]: Number.isNaN(parseInt(notion.fields[k])) ||
              // ignore type transform for ModuleId & mirrorNFTAddress
              (k === 'Module' || k === 'Mirror NFT address' || k === 'Lesson collectible mint ID' || k === 'Lesson collectible token address' || k === 'Sponsor Name' || k === 'Languages' || k === 'Publication Date')
              ? notion.fields[k]
              : parseInt(notion.fields[k]),
          }),
        {}
      )
      // skip import if LESSON_NOTION_ID is specified
      if (lesson.publicationStatus === undefined) return
      notion.id = notion.id.replace(/-/g, '')
      if (LESSON_NOTION_ID && notion.id !== LESSON_NOTION_ID) return
      // TEMP: we don't publish planned lesson ATM
      if (lesson.publicationStatus === 'planned') return
      console.log('Notion lesson link: ', `${POTION_API}/html?id=${notion.id}`)

      if (lesson.description === undefined) lesson.description = ''
      if (lesson.socialImageLink === undefined) delete lesson.socialImageLink
      if (lesson.badgeId === undefined) lesson.badgeId = null
      if (lesson.badgeImageLink === undefined) lesson.badgeImageLink = null
      if (lesson.lessonCollectedImageLink === undefined) delete lesson.lessonCollectedImageLink
      if (lesson.lessonCollectibleVideo === undefined) delete lesson.lessonCollectibleVideo
      if (lesson.lessonCollectibleGif === undefined) delete lesson.lessonCollectibleGif
      if (lesson.lessonCollectibleMintID === undefined) delete lesson.lessonCollectibleMintID
      if (lesson.lessonCollectibleTokenAddress === undefined) delete lesson.lessonCollectibleTokenAddress
      if (lesson.lessonCollectibleMintID && lesson.lessonCollectibleTokenAddress) lesson.hasCollectible = true
      if (lesson.lessonImageLink === undefined) lesson.lessonImageLink = null
      if (lesson.difficulty === undefined) delete lesson.difficulty
      if (lesson.endOfLessonText === undefined) delete lesson.endOfLessonText
      if (lesson.marketingDescription === undefined) lesson.marketingDescription = lesson.description
      if (lesson.learningActions === undefined) lesson.learningActions = ''
      if (lesson.learnings === undefined) lesson.learnings = ''
      if (lesson.publicationDate === undefined || lesson.publicationDate === null || !lesson.publicationDate.startsWith('20')) delete lesson.publicationDate
      if (lesson.featuredOrderOnHomepage === undefined) lesson.featuredOrderOnHomepage = false
      if (lesson.isCommentsEnabled === undefined) lesson.isCommentsEnabled = false
      if (lesson.endOfLessonRedirect === undefined) lesson.endOfLessonRedirect = null
      if (lesson.moduleId === undefined) delete lesson.moduleId
      else lesson.moduleId = lesson.moduleId[0]
      if (lesson.languages === undefined) delete lesson.languages
      // sort languages alphabetically
      else lesson.languages.sort()
      if (lesson.lessonWriters === undefined) delete lesson.lessonWriters
      if (lesson.communityDiscussionLink === undefined) delete lesson.communityDiscussionLink
      if (lesson.mirrorLink === undefined || lesson.mirrorLink === null) delete lesson.mirrorLink
      if (lesson.mirrorNFTAddress === undefined || lesson.mirrorNFTAddress === null) delete lesson.mirrorNFTAddress
      if (lesson.areMirrorNFTAllCollected === undefined) delete lesson.areMirrorNFTAllCollected
      if (lesson.sponsorName === undefined || lesson.sponsorName === null) delete lesson.sponsorName
      if (lesson.sponsorLogo === undefined || lesson.sponsorLogo === null) delete lesson.sponsorLogo
      if (lesson.nftGating === undefined || lesson.nftGating === null) delete lesson.nftGating
      if (lesson.nftGatingRequirements === undefined || lesson.nftGatingRequirements === null) delete lesson.nftGatingRequirements
      if (lesson.nftGatingImageLink === undefined || lesson.nftGatingImageLink === null) delete lesson.nftGatingImageLink
      if (lesson.nftGatingLink === undefined || lesson.nftGatingLink === null) delete lesson.nftGatingLink
      if (lesson.nftGatingCTA === undefined || lesson.nftGatingCTA === null) delete lesson.nftGatingCTA

      // console.log(lesson)

      const mirrorId = lesson.mirrorLink?.split('/')?.pop()
      if (lesson.mirrorLink && mirrorId) {
        lesson.isArticle = true
        lesson.notionId = notion.id
        lesson.englishName = lesson.name
        lesson.slug = slugify(lesson.name)
        delete lesson.quest
        await axios({
          url: 'https://arweave.net/graphql',
          method: 'post',
          data: {
            query: `
              query GetMirrorTransactions($digest: String!) {
                transactions(tags:[
                  {
                    name:"App-Name",
                    values:["MirrorXYZ"],
                  },
                  {
                    name:"Original-Content-Digest",
                    values:[$digest]
                  }
                ], sort:HEIGHT_DESC, first: 10){
                  edges {
                    node {
                      id
                    }
                  }
                }
              }`,
            variables: { "digest": mirrorId }
          }
        }).then(async (result) => {
          const arweaveTxId = result?.data?.data?.transactions?.edges[0]?.node?.id
          console.log('Mirror article: ', arweaveTxId)
          if (arweaveTxId) {
            return axios
              .get(`https://arweave.net/${arweaveTxId}`)
              .then(async ({ data }) => {
                // console.log(data)
                // console.log(data?.content?.body)
                // console.log(data?.content?.title)
                lesson.articleContent = data?.content?.body
                  .replace(/\\\[/g, "[")
                  .replace(/\\\]/g, "]")
                // console.log('lesson', lesson)

                if (lesson.articleContent.includes('\n\n\n---\n\n')) {
                  const articleContentArray = lesson.articleContent.split('\n\n\n---\n\n')
                  if (articleContentArray.length && articleContentArray[articleContentArray.length - 1].includes('Explore more lessons')) {
                    articleContentArray.pop()
                    lesson.articleContent = articleContentArray.join('\n\n\n---\n\n')
                  }
                  if (articleContentArray.length && articleContentArray[articleContentArray.length - 1].includes('financial or tax advice')) {
                    articleContentArray.pop()
                    lesson.articleContent = articleContentArray.join('\n\n\n---\n\n')
                  }
                }

                // TODO: save mirror images locally

                if (lesson.lessonImageLink) {
                  lesson.lessonImageLink = get_img(lesson.lessonImageLink, lesson.slug, 'lesson')
                }
                if (lesson.socialImageLink) {
                  lesson.socialImageLink = get_img(lesson.socialImageLink, lesson.slug, 'social')
                }
                if (lesson.sponsorLogo) {
                  lesson.sponsorLogo = get_img(lesson.sponsorLogo, lesson.slug, 'sponsor')
                }

                lesson.imageLinks = []
                lessons[index] = lesson
                if (MD_ENABLED) {
                  // import translations
                  importTranslations(lesson)
                  // console.log(lesson.articleContent)
                  let lessonContentMD = lesson.articleContent
                  try {
                    // HACK: replace image
                    const imageRegex = /!\[.*?\]\((.*?)\)/g;
                    let match
                    while ((match = imageRegex.exec(lessonContentMD)) !== null) {
                      // fix weird bug with \
                      const imageLink = match[1].replace('\\', '')
                      // console.log(imageLink)
                      const file_extension = imageLink.match(/\.(png|svg|jpg|jpeg|webp|webm|mp4|gif)/)[1]
                      // create "unique" hash based on Notion imageLink (different when re-uploaded)
                      const hash = crc32(imageLink)
                      const image_dir = `/${PROJECT_DIR}images/${lesson.slug}`
                      const local_image_dir = `public${image_dir}`
                      // create image directory dynamically in case it doesn't exist yet
                      if (!fs.existsSync(local_image_dir)) {
                        fs.mkdirSync(local_image_dir)
                      }
                      const image_path = `${image_dir}/image-${hash}.${file_extension}`
                      const local_image_path = `public${image_path}`
                      // console.log(local_image_path)
                      lesson.imageLinks.push(image_path)
                      if (!fs.existsSync(local_image_path)) {
                        download_image(imageLink, local_image_path)
                        console.log('downloading image: ', local_image_path)
                      }
                      lessonContentMD = lessonContentMD.replaceAll(match[1], `https://app.banklessacademy.com${image_path}`)
                    }
                    lesson.articleContent = lessonContentMD.replaceAll('https://app.banklessacademy.com/images/', '/images/')
                    // write/update file
                    const lessonPath = `translation/lesson/en/${lesson.slug}.md`
                    const lessonHeader = mdHeader(lesson, 'HANDBOOK')
                    if (fs.existsSync(lessonPath)) {
                      const lessonFile = await fs.promises.readFile(lessonPath, 'utf8')
                      if (lessonFile) {
                        // eslint-disable-next-line no-unsafe-optional-chaining
                        const [previousLessonHeader, previousLessonContentMD] = lessonFile?.split(LESSON_SPLITTER)
                        // console.log(previousLessonContentMD.trim())
                        // console.log(lessonContentMD.trim())
                        // If content has changed
                        const plh = previousLessonHeader?.split(/FORMAT\: (.*?)\n/)[0]
                        const lh = lessonHeader?.split(/FORMAT\: (.*?)\n/)[0]
                        if (plh.trim() !== lh.trim() ||
                          previousLessonContentMD.trim() !== lessonContentMD.trim()
                        ) {
                          fs.writeFile(lessonPath, `${lessonHeader}${lessonContentMD}`, (error) => {
                            if (error) throw error
                          })
                          console.log(
                            `"${lesson.name}" updated in ${lessonPath}`
                          )
                        }
                        else console.log(
                          `"${lesson.name}" is unchanged`
                        )
                      }
                    }
                    else {
                      fs.writeFile(lessonPath, `${lessonHeader}${lessonContentMD}`, (error) => {
                        if (error) throw error
                      })
                      console.log(
                        `"${lesson.name}" exported in ${lessonPath}`
                      )
                    }

                  } catch (error) {
                    console.log(error)
                  }
                }
              })
          }
        })
        return
      }

      return axios
        .get(`${POTION_API}/html?id=${notion.id}`)
        .then(async (htmlPage) => {
          lesson.notionId = notion.id
          lesson.englishName = lesson.name
          lesson.slug = slugify(lesson.name)
          // add notionId to DB
          await db(TABLES.credentials).insert([{ notion_id: lesson.notionId }]).onConflict('notion_id')
            .ignore()

          if (lesson.badgeImageLink) {
            lesson.badgeImageLink = get_img(lesson.badgeImageLink, lesson.slug, 'badge')
          } else lesson.badgeImageLink = placeholder(lesson, '600x600', 'badge')
          if (lesson.lessonImageLink) {
            lesson.lessonImageLink = get_img(lesson.lessonImageLink, lesson.slug, 'lesson')
          } else lesson.lessonImageLink = placeholder(lesson, '1200x600', 'lesson')
          if (lesson.socialImageLink) {
            lesson.socialImageLink = get_img(lesson.socialImageLink, lesson.slug, 'social')
          } else lesson.socialImageLink = placeholder(lesson, '1200x600', 'social')
          if (lesson.sponsorLogo) {
            lesson.sponsorLogo = get_img(lesson.sponsorLogo, lesson.slug, 'sponsor')
          }
          if (lesson.nftGatingImageLink) {
            lesson.nftGatingImageLink = get_img(lesson.nftGatingImageLink, lesson.slug, 'nft')
          }
          delete lesson.areMirrorNFTAllCollected

          lesson.imageLinks = []
          // data cleaning
          htmlPage.data = htmlPage.data.includes('<h1 notion-id=') ? htmlPage.data
            .replace(/"/g, "'")
            // strip parentheses content (slide numbers)
            // .replace(/ *\([^)]*\) */g, '')
            // collapse whitespace
            .replace(/\s+/g, ' ')
            .replace(
              /<h1 notion-id='(.*?)'>/g,
              `"},{"type": "LEARN", "notionId":"$1", "title": "`
            )
            .replace(/<\/h1>/g, `","content": "`)
            // remove extra "}, at the beginning
            .substr(3) : `{"type": "LEARN", "title": "TODO", "content": "<p>slide content</p>`
          const content = JSON.parse(`[${htmlPage.data}"}]`)
          let quizNb = 0
          const slides = content.map((slide) => {
            // remove tags in title
            slide.title = slide.title.replace(/<[^>]*>?/gm, '')
            // replace with type QUIZ
            if (slide.content.includes("<div class='checklist'>")) {
              quizNb++
              slide.quiz = {}
              slide.type = 'QUIZ'
              const [question] = slide.content.split(
                "<div class='checklist'>"
              )
              slide.quiz.question = question
                .replace('<p>', '')
                .replace('</p>', '')
              slide.quiz.rightAnswerNumber = undefined
              slide.quiz.answers = []
              slide.quiz.feedback = []
              const quizDiv = new JSDOM(slide.content)
              const checkboxes = quizDiv.window.document.querySelectorAll(
                '.checklist input[type="checkbox"]:disabled'
              )
              const blockquotes = quizDiv.window.document.querySelectorAll('blockquote')
              const labels = quizDiv.window.document.querySelectorAll('.checklist label')

              for (let i = 0; i < checkboxes.length; i++) {
                const nb = i + 1
                const checkbox = checkboxes[i]
                const blockquote = blockquotes[i]
                const label = labels[i]

                const answer = label.textContent.trim()
                slide.quiz.answers.push(answer)

                const feedback = blockquote?.textContent.trim()
                if (feedback)
                  slide.quiz.feedback.push(feedback)

                const isChecked = checkbox?.checked
                if (isChecked) slide.quiz.rightAnswerNumber = nb
              }
              if (slide.quiz.feedback.length === 0) delete slide.quiz.feedback
              if (!slide.quiz.rightAnswerNumber && lesson.slug !== 'bankless-archetypes')
                throw new Error(
                  `missing right answer, please check ${POTION_API}/html?id=${notion.id}`
                )
              else if (lesson.slug === 'bankless-archetypes') delete slide.quiz.rightAnswerNumber
              slide.quiz.id = `${lesson.slug}-${quizNb}`
              delete slide.content
            }
            if (slide.content) {
              // download images locally
              const imageLinks = [...slide.content.matchAll(/<img src='(.*?)'/gm)].map(a => a[1])
              for (const imageLink of imageLinks) {
                const file_extension = imageLink.match(/\.(png|svg|jpg|jpeg|webp|webm|mp4|gif)\?table=/)[1]
                // create "unique" hash based on Notion imageLink (different when re-uploaded)
                const hash = crc32(imageLink)
                const image_dir = `/${PROJECT_DIR}images/${lesson.slug}`
                const local_image_dir = `public${image_dir}`
                // create image directory dynamically in case it doesn't exist yet
                if (!fs.existsSync(local_image_dir)) {
                  fs.mkdirSync(local_image_dir)
                }
                const image_path = `${image_dir}/${slugify(slide.title)}-${hash}.${file_extension}`
                const local_image_path = `public${image_path}`
                slide.content = slide.content.replace(imageLink, image_path)
                lesson.imageLinks.push(image_path)
                if (!fs.existsSync(local_image_path)) {
                  download_image(imageLink, local_image_path)
                  console.log('downloading image: ', local_image_path)
                }
              }

              if ((slide.content.match(/<img /g) || []).length > 1) {
                // multiple images
                const blocs = slide.content
                  .replace(
                    /<img src='([^>]*)'>/gi,
                    '|SPLIT|$1|SPLIT|'
                  )
                  // .replace(/<img src='/g, '|SPLIT|')
                  // .replace(/'>/g, '|SPLIT|')
                  .replace('|SPLIT|', '')
                  .split('|SPLIT|')
                slide.content = blocs.reduce((p, c, i) => (i % 2 === 0) ? `${p}<div class="bloc-ab"><div class="bloc-a"><img src='${c}'></div>` : `${p}<div class="bloc-b">${c}</div></div>`, '')
              } else if (slide.content.includes('<img ')) {
                // content contains an image -> 1st bloc = text | second bloc = square image
                const [bloc1, bloc2] = slide.content.split('<img ')
                if (bloc1 !== '' && bloc2 !== '')
                  slide.content = `<div class="bloc1">${bloc1}</div><div class="bloc2"><img ${bloc2}</div>`
              } else if (slide.content.includes('<iframe ')) {
                // content contains an iframe
                const [bloc1, bloc2] = slide.content.split('<iframe ')
                if (bloc2 !== '') {
                  slide.content = `${bloc1 !== '' ? `<div class="bloc1">${bloc1}</div>` : ''}`
                  slide.content += `<div class="bloc2"><iframe allowfullscreen ${bloc2.replace(/feature=oembed/g, 'feature=oembed&rel=0')}</div>`
                }
              } else {
                // text only
                slide.content = `<div class="bloc1">${slide.content}</div>`
              }
            }
            return slide
          })
          const componentName = PROJECT_DIR.replace(/[^A-Za-z0-9]/g, '') + lesson.name
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace('á', 'a')
            .replace(/\s+/g, '')
            .replace(/[^A-Za-z0-9]/g, '') // remove invalid chars
          if (IS_WHITELABEL) {
            lesson.quest = componentName
          } else if (lesson.quest === true) {
            lesson.quest = componentName
            slides.push({
              type: 'QUEST',
              title: `${lesson.name} Quest`,
              component: componentName,
            })
          } else {
            delete lesson.quest
          }
          lesson.slides = slides
          // console.log('lesson', lesson)

          if (lesson.hasCollectible) {
            if (lesson.lessonCollectedImageLink) {
              lesson.lessonCollectedImageLink = get_img(lesson.lessonCollectedImageLink, lesson.slug, 'datadisk-collected')
            }
            if (lesson.lessonCollectibleGif) {
              lesson.lessonCollectibleGif = get_img(lesson.lessonCollectibleGif, lesson.slug, 'datadisk-gif')
            }
            if (lesson.lessonCollectibleVideo) {
              lesson.lessonCollectibleVideo = get_img(lesson.lessonCollectibleVideo, lesson.slug, 'datadisk-video')
            }
          }

          lessons[index] = lesson

          if (lesson.publicationStatus === 'planned') {
            lesson.lessonImageLink = '/images/coming-soon-lesson.png'
          }

          // TODO: remove old images (diff between old/new lesson.imageLinks)

          if (MD_ENABLED) {
            // import translations
            importTranslations(lesson)
            // convert to MD
            console.log(`Converting "${lesson.name}" to MD`)
            try {
              const mdblocks = await n2m.pageToMarkdown(notion.id)
              const mdString = n2m.toMarkdownString(mdblocks)
              // hide answers
              let lessonContentMD = mdString?.parent?.replaceAll('[x]', '[ ]') || ''
              lessonContentMD = lessonContentMD.replaceAll('\n\n\n\n', '\n\n')
              lessonContentMD = lessonContentMD.replaceAll('\n\n\n', '\n\n')
              const slides = lessonContentMD.split('\n# ')
              slides.shift()
              let quiz_nb = 0
              let j = 0
              for (const slide of slides) {
                const slide_array = slide.split('\n')
                let slide_title = slide_array.shift()
                const slide_content = slide_array.join('\n')
                // console.log(slide_title)
                // console.log(slide_content)
                if (slide_content.includes('- [ ]')) {
                  quiz_nb++
                  slide_title = `Knowledge Check ${quiz_nb}`
                }
                slides[j] = `\n# ${slide_title}\n${slide_content}`
                j++
              }
              lessonContentMD = slides.join("")

              // HACK: replace image
              const imageRegex = /!\[.*?\]\((.*?)\)/g;
              let match
              let i = 0
              while ((match = imageRegex.exec(lessonContentMD)) !== null) {
                lessonContentMD = lessonContentMD.replaceAll(match[1], `https://app.banklessacademy.com${lesson.imageLinks[i]}`)
                i++
              }
              // write/update file
              const lessonPath = `translation/lesson/en/${lesson.slug}.md`
              const lessonHeader = mdHeader(lesson, "LESSON")
              if (fs.existsSync(lessonPath)) {
                const lessonFile = await fs.promises.readFile(lessonPath, 'utf8')
                if (lessonFile) {
                  // eslint-disable-next-line no-unsafe-optional-chaining
                  const [previousLessonHeader, previousLessonContentMD] = lessonFile?.split(LESSON_SPLITTER)
                  // console.log(previousLessonContentMD.trim())
                  // console.log(lessonContentMD.trim())
                  // If content has changed
                  const plh = previousLessonHeader?.split(/FORMAT\: (.*?)\n/)[0]
                  const lh = lessonHeader?.split(/FORMAT\: (.*?)\n/)[0]
                  if (plh.trim() !== lh.trim() ||
                    previousLessonContentMD.trim() !== lessonContentMD.trim()
                  ) {
                    fs.writeFile(lessonPath, `${lessonHeader}${lessonContentMD}`, (error) => {
                      if (error) throw error
                    })
                    console.log(
                      `"${lesson.name}" updated in ${lessonPath}`
                    )
                  }
                  else console.log(
                    `"${lesson.name}" is unchanged`
                  )
                }
              }
              else {
                fs.writeFile(lessonPath, `${lessonHeader}${lessonContentMD}`, (error) => {
                  if (error) throw error
                })
                console.log(
                  `"${lesson.name}" exported in ${lessonPath}`
                )
              }

            } catch (error) {
              console.log(error)
            }
          }
        })
    })
    axios.all(promiseArray).then(() => {
      const FILE_CONTENT = `/* eslint-disable no-useless-escape */
import { LessonType } from 'entities/lesson'

const LESSONS: LessonType[] = ${stringifyObject(lessons, {
        indent: '  ',
        singleQuotes: true,
      })}

export default LESSONS
`
      if (!TRANSLATION_ONLY)
        fs.writeFile(`src/constants/${LESSON_FILENAME}.ts`, FILE_CONTENT, (error) => {
          if (error) throw error
        })
      console.log(
        `export done -> check syntax & typing errors in src/constants/${LESSON_FILENAME}.ts`
      )
    })
  })
  .catch((error) => {
    console.error(error)
  })
