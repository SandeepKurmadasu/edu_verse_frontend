import {gql} from '@apollo/client'

export const GET_TOPIC_VIDEO = gql`
  query GetTopicVideo($topicId: String!) {
    getTopicVideo(params: {topicId: $topicId}) {
      __typename
      ... on TopicVideoType {
        title
        videoId
        videoUrl
        topicId
      }
      ... on TopicNotFound {
        topicId
      }
    }
  }
`
