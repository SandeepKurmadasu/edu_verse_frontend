import {gql} from '@apollo/client'

export const GET_LEARNING_UNITS_BY_PATH = gql`
  query GetUserLearningUnits($userLearningPathId: String!) {
    getUserLearningUnits(params: {userLearningPathId: $userLearningPathId}) {
      ... on UserLearningUnitsProgressType {
        units {
          userLearningUnitId
          topicId
          moduleId
          isLocked
          percentage
          status
        }
      }
      ... on UserLearningPathIdNotFoundType {
        userLearningPathId
      }
    }
  }
`
