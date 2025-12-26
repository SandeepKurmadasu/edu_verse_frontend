import {gql} from '@apollo/client'

export const GET_ASSESSMENT_BY_TOPIC = gql`
  query GetAssessmentByTopic($topicId: String!) {
    getAssessmentByTopic(params: {topicId: $topicId}) {
      __typename
      ... on AssessmentType {
        assessmentId
        assessmentTitle
        assessmentType
        topicId
        description
        passMarks
        icon
        noOfQuestions
        marks
        passPercentage
        easyCount
        mediumCount
        hardCount
        attemptsLimit
        estimateDurationInMins
      }
      ... on TopicNotFound {
        topicId
      }
    }
  }
`

export const START_ASSESSMENT_ATTEMPT = gql`
  mutation StartAttempt($params: StartAttemptReqParams!) {
    createAttempt(params: $params) {
      __typename
      ... on AssessmentAttemptType {
        attemptId
        userId
        assessmentId
        totalPoints
        questionIds
        status
        startedAt
      }
      ... on AttemptsCompletedType {
        userId
        assessmentId
        attemptsLimit
        userAttemptedCount
      }
      ... on AssessmentNotFoundType {
        assessmentId
      }
      ... on AssessmentUserNotFoundType {
        userId
      }
    }
  }
`

export const GET_LATEST_ATTEMPT = gql`
  query GetLatestAttempt($params: GetLatestAttemptReqParams!) {
    getLatestAttempt(params: $params) {
      __typename
      ... on AssessmentAttemptType {
        assessmentId
        attemptId
        questionIds
        startedAt
        status
        totalPoints
        userId
      }
      ... on AssessmentNotFoundType {
        assessmentId
      }
      ... on AssessmentUserNotFoundType {
        userId
      }
    }
  }
`
