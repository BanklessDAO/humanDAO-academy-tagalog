import React, { useRef, useState, useEffect } from 'react'
import {
  Box,
  Text,
  Image,
  ButtonGroup,
  Button,
  HStack,
  VStack,
  SimpleGrid,
  Kbd,
} from '@chakra-ui/react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { useHotkeys } from 'react-hotkeys-hook'
import styled from '@emotion/styled'
import rehypeRaw from 'rehype-raw'

import { QuestType } from 'entities/quest'
import ProgressSteps from 'components/ProgressSteps'
import QuestComponent from 'components/Quest/QuestComponent'
import { useWalletWeb3React } from 'hooks'

const Slide = styled(Box)`
  border-radius: 0.5rem;
  h1 {
    margin-top: 1em;
    font-size: var(--chakra-fontSizes-2xl);
  }
  h2 {
    font-size: var(--chakra-fontSizes-xl);
    margin: 1em;
  }
  ul {
    margin-left: 2em;
  }
`

const Answers = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  button {
    margin: 3em;
    padding: 2em;
  }
  span {
    color: black;
    margin-right: 0.5em;
  }
`

// TODO: move to utils
const youtubeLink2Iframe = (html) =>
  html.replace(
    /(?:https:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?.*v=)?(\w+)/g,
    '<iframe width="640" height="360" src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe>'
  )

const Quest = ({ quest }: { quest: QuestType }): React.ReactElement => {
  const buttonLeftRef = useRef(null)
  const buttonRightRef = useRef(null)
  const answer1Ref = useRef(null)
  const answer2Ref = useRef(null)
  const answer3Ref = useRef(null)
  const answer4Ref = useRef(null)
  const [currentSlide, setCurrentSlide] = useState(
    parseInt(localStorage.getItem(quest.slug) || '0')
  )
  const [selectedAnswerNumber, setSelectedAnswerNumber] = useState<number>(null)
  const [isPoapClaimed, setIsPoapClaimed] = useState(true)
  const [isClaimingPoap, setIsClaimingPoap] = useState(false)

  const numberOfSlides = quest.slides.length
  const slide = quest.slides[currentSlide]
  const isFirstSlide = currentSlide === 0
  const isLastSlide = currentSlide + 1 === numberOfSlides

  const walletWeb3ReactContext = useWalletWeb3React()
  const walletAddress =
    walletWeb3ReactContext.account ||
    // you can force a specific wallet address here if you want to test
    '0xbd19a3f0a9cace18513a1e2863d648d13975cb39'

  useEffect((): void => {
    localStorage.setItem(quest.slug, currentSlide.toString())
    if (slide.type === 'POAP') {
      // check if POAP is already claimed
      axios
        .get(`https://api.poap.xyz/actions/scan/${walletAddress}`)
        .then((response) => response.data)
        .then((poaps: { event: { id: number } }[]) =>
          setIsPoapClaimed(
            poaps.filter((p) => p.event.id === quest.poapEventId).length === 1
          )
        )
        .catch(function (error) {
          // eslint-disable-next-line no-console
          console.log(error)
        })
    }
  }, [currentSlide])

  const goToPrevSlide = () => {
    setSelectedAnswerNumber(null)
    if (!isFirstSlide) setCurrentSlide(currentSlide - 1)
  }

  const goToNextSlide = () => {
    setSelectedAnswerNumber(null)
    if (slide.quiz && localStorage.getItem(`quiz-${slide.quiz.id}`) === null) {
      alert('select your answer to the quiz first')
    } else if (!isLastSlide) setCurrentSlide(currentSlide + 1)
  }

  const selectAnswer = (answerNumber: number) => {
    if (!answerIsCorrect) setSelectedAnswerNumber(answerNumber)
    if (slide.quiz.right_answer_number === answerNumber) {
      // correct answer
      localStorage.setItem(`quiz-${slide.quiz.id}`, answerNumber.toString())
    } else {
      // wrong answer
      // TODO: add error UI
    }
  }

  const claimPoap = () => {
    setIsClaimingPoap(true)
    axios
      .get(
        `/api/claim-poap?address=${walletAddress}&poapEventId=${quest.poapEventId}`
      )
      .then(function (res) {
        // eslint-disable-next-line no-console
        console.log(res.data)
        setIsPoapClaimed(true)
        setIsClaimingPoap(false)
      })
      .catch(function (error) {
        // eslint-disable-next-line no-console
        console.log(error)
      })
  }

  // shortcuts
  // TODO: add modal with all the shortcuts
  useHotkeys('?,shift+/', () => alert('TODO: add modal with all the shortcuts'))
  useHotkeys('left', () => {
    buttonLeftRef?.current?.click()
  })
  useHotkeys('right', () => {
    buttonRightRef?.current?.click()
  })
  useHotkeys('1', () => {
    answer1Ref?.current?.click()
  })
  useHotkeys('2', () => {
    answer2Ref?.current?.click()
  })
  useHotkeys('3', () => {
    answer3Ref?.current?.click()
  })
  useHotkeys('4', () => {
    answer4Ref?.current?.click()
  })
  // TEMP
  useHotkeys('r', () => {
    localStorage.clear()
    setCurrentSlide(0)
  })

  const localStorageAnswer: number = slide.quiz
    ? parseInt(localStorage.getItem(`quiz-${slide.quiz.id}`))
    : null

  const answerIsCorrect =
    slide.quiz &&
    localStorage.getItem(`quiz-${slide.quiz.id}`) ===
      '' + slide.quiz.right_answer_number

  return (
    <>
      <ProgressSteps step={currentSlide} total={numberOfSlides} />
      <Slide minH="620px" bgColor="white" p={8} mt={4}>
        {slide.type === 'LEARN' && (
          <>
            <Text fontSize="3xl">📚 {slide.title}</Text>
            {slide.content && (
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {youtubeLink2Iframe(slide.content)}
              </ReactMarkdown>
            )}
          </>
        )}
        {slide.type === 'QUIZ' && (
          <>
            <Text fontSize="3xl">❓ {slide.quiz.question}</Text>
            <Answers>
              <ButtonGroup
                colorScheme={answerIsCorrect ? 'green' : 'red'}
                size="lg"
              >
                <SimpleGrid columns={[null, null, 2]} spacing="40px">
                  <Button
                    ref={answer1Ref}
                    onClick={() => selectAnswer(1)}
                    isActive={
                      (selectedAnswerNumber || localStorageAnswer) === 1
                    }
                  >
                    <span>
                      <Kbd>1</Kbd>
                    </span>
                    {slide.quiz.answer_1}
                  </Button>
                  <Button
                    ref={answer2Ref}
                    onClick={() => selectAnswer(2)}
                    isActive={
                      (selectedAnswerNumber || localStorageAnswer) === 2
                    }
                  >
                    <span>
                      <Kbd>2</Kbd>
                    </span>
                    {slide.quiz.answer_2}
                  </Button>
                  <Button
                    ref={answer3Ref}
                    onClick={() => selectAnswer(3)}
                    isActive={
                      (selectedAnswerNumber || localStorageAnswer) === 3
                    }
                  >
                    <span>
                      <Kbd>3</Kbd>
                    </span>
                    {slide.quiz.answer_3}
                  </Button>
                  <Button
                    ref={answer4Ref}
                    onClick={() => selectAnswer(4)}
                    isActive={
                      (selectedAnswerNumber || localStorageAnswer) === 4
                    }
                  >
                    <span>
                      <Kbd>4</Kbd>
                    </span>
                    {slide.quiz.answer_4}
                  </Button>
                </SimpleGrid>
              </ButtonGroup>
            </Answers>
          </>
        )}
        {slide.type === 'QUEST' && (
          <>
            <Text fontSize="3xl">⚡️ {slide.title}</Text>
            {slide.content && (
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {youtubeLink2Iframe(slide.content)}
              </ReactMarkdown>
            )}
            {slide.component && <QuestComponent component={slide.component} />}
          </>
        )}
        {slide.type === 'POAP' && (
          <>
            <Text fontSize="3xl">🎖 {slide.title}</Text>
            <VStack flex="auto">
              <Image src={quest.poap_image} width="250px" mt="100px" />
              {!isPoapClaimed && (
                <Button
                  variant="outline"
                  onClick={claimPoap}
                  isLoading={isClaimingPoap}
                >
                  Claim POAP
                </Button>
              )}
            </VStack>
          </>
        )}
      </Slide>
      <Box display="flex" p={4}>
        <HStack flex="auto">
          <Button>🗣</Button>
          <Button>🏴</Button>
        </HStack>
        <HStack>
          <Button
            onClick={() => {
              localStorage.clear()
              setCurrentSlide(0)
            }}
          >
            <span>
              <Kbd color="black" mr="0.5em">
                r
              </Kbd>
            </span>
            reset
          </Button>
          {!isFirstSlide && (
            <Button ref={buttonLeftRef} onClick={goToPrevSlide}>
              ⬅️
            </Button>
          )}
          <Button
            ref={buttonRightRef}
            disabled={isLastSlide || (slide.quiz && !answerIsCorrect)}
            onClick={goToNextSlide}
          >
            ➡️
          </Button>
        </HStack>
      </Box>
    </>
  )
}

export default Quest
