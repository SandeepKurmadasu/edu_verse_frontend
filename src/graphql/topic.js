// src/graphql/topic.js

import {gql} from '@apollo/client'

export const GET_TOPIC = gql`
  query GetTopic($topicId: String!) {
    getTopics(params: {topicIds: [$topicId]}) {
      __typename
      ... on TopicsType {
        topics {
          topicId
          moduleId
          title
          description
          topicType
          content
          order
          estimatedDurationInMins
        }
      }
      ... on TopicIdsNotFound {
        topicIds
      }
    }
  }
`
