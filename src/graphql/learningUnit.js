import {gql} from '@apollo/client'

export const UPDATE_LEARNING_UNIT_PROGRESS = gql`
  mutation UpdateLearningUnitProgress(
    $params: UpdateLearningUnitProgressInput!
  ) {
    updateLearningUnitProgress(params: $params) {
      ... on UpdateLearningUnitProgressType {
        nextUnitId
        nextUnitUnlocked
        overallPathPercentage
        updatedPercentage
        updatedStatus
        userLearningPathId
        userLearningUnitId
      }
      ... on UserLearningUnitIdNotFoundType {
        __typename
        userLearningUnitId
      }
      ... on LearningUnitLockedExceptionType {
        __typename
        userLearningUnitId
      }
    }
  }
`
