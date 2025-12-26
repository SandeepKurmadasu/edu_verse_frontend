import {gql} from '@apollo/client'

// Get next question in attempt
export const GET_NEXT_QUESTION = gql`
  query GetNextQuestion($attemptId: String!) {
    getNextQuestion(params: {attemptId: $attemptId}) {
      __typename
      ... on DisplayQuestionType {
        questionId
        questionText
        questionType
        options
      }
      ... on AssessmentAttemptProgressType {
        attemptId
        status
      }
      ... on AttemptNotFoundType {
        attemptId
      }
    }
  }
`

// Submit answer
export const SUBMIT_ANSWER = gql`
  mutation SubmitAnswer($params: SubmitQuestionReqParams!) {
    submitAnswer(params: $params) {
      __typename

      ... on SubmitAnswerType {
        attemptId
        userId
        assessmentId
        totalPoints
        isCorrect
        points
      }

      ... on AlreadyAttemptedExistType {
        questionId
      }
    }
  }
`

// Get attempt score
export const GET_ATTEMPT_SCORE = gql`
  query GetAttemptScore($params: GetAttemptScoreReqParams!) {
    getAttemptScore(params: $params) {
      __typename
      ... on AttemptScoreType {
        attemptId
        userId
        score
        startedAt
      }
      ... on AttemptNotFoundType {
        attemptId
      }
    }
  }
`

// End attempt - UPDATED with startedAt and completedAt
export const ATTEMPT_END = gql`
  mutation AttemptEnd($params: EndAnAttemptReqParams!) {
    attemptEnd(params: $params) {
      __typename
      ... on AttemptEndType {
        attemptId
        userId
        assessmentId
        totalPoints
        status
        startedAt
        completedAt
      }
      ... on AttemptNotFoundType {
        attemptId
      }
    }
  }
`

export const EVALUATE_QUESTION = gql`
  mutation EvaluateQuestion($params: EvaluateQuestionInput!) {
    evaluateQuestion(params: $params) {
      __typename
      ... on EvaluateQuestionType {
        status
        correctCount
        totalCount
      }
      ... on QuestionNotFoundError {
        questionId
      }
      ... on EvaluationError {
        message
      }
    }
  }
`
