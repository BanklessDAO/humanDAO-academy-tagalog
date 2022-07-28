import React from 'react'
import NextLink from 'next/link'
import { Box, Text, Image, Heading, Button, SimpleGrid } from '@chakra-ui/react'
import { useMediaQuery } from '@chakra-ui/react'
import styled from '@emotion/styled'

import LessonBanner from 'components/LessonBanner'
import { IS_WHITELABEL } from 'constants/index'
import { ModuleType } from 'entities/module'

const LessonGrid = styled(SimpleGrid)`
  border-bottom: 1px solid #72757b;
  :last-child {
    border-bottom: none;
  }
`

const Modules = ({
  modules,
  title,
}: {
  modules: ModuleType[]
  title?: string
}): React.ReactElement => {
  const [isSmallScreen] = useMediaQuery('(max-width: 800px)')

  return (
    <Box mt="16">
      <Heading as="h2" size="xl">
        {title || `Available Modules`}
      </Heading>
      <Box>
        {modules.map((module, key) => {
          const hasSubmodules = module.submodules?.length > 0
          const moduleLink = hasSubmodules
            ? `/modules/${module.slug}`
            : `/lessons?module=${module.slug}`
          const ModuleImage = (
            <LessonBanner
              iswhitelabel={IS_WHITELABEL}
              cursor="pointer"
              style={{
                aspectRatio: '1.91/1',
              }}
              maxW="600px"
            >
              <NextLink href={moduleLink}>
                <Image src={module.moduleImageLink} />
              </NextLink>
            </LessonBanner>
          )
          const ModuleDescription = (
            <Box alignSelf="center" mt="4">
              <Heading fontSize="2xl">{module.name}</Heading>
              <Text fontSize="lg" my="4">
                {module.description}
              </Text>
              <NextLink href={moduleLink}>
                <Button variant="primary" mt="4">
                  Explore Module
                </Button>
              </NextLink>
            </Box>
          )
          return (
            <LessonGrid
              columns={{ sm: 1, md: 2, lg: 2 }}
              key={key}
              gap={6}
              py="10"
              mx={isSmallScreen ? '0' : '12'}
            >
              {key % 2 === 0 || isSmallScreen ? (
                <>
                  {ModuleImage}
                  {ModuleDescription}
                </>
              ) : (
                <>
                  {ModuleDescription}
                  {ModuleImage}
                </>
              )}
            </LessonGrid>
          )
        })}
      </Box>
    </Box>
  )
}

export default Modules
