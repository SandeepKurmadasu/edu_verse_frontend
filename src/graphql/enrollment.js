import {gql} from '@apollo/client'

export const ENROLL_COURSE = gql`
  mutation EnrollUserForCourse($userId: String!, $courseId: String!) {
    enrollUserForCourse(params: {userId: $userId, courseId: $courseId}) {
      ... on EnrollmentType {
        id
        userId
        courseId
        courseTitle
        courseStatus
        coursePercentage
        userLearningPathId
      }
      ... on CourseNotFoundType {
        courseId
      }
      ... on UserNotFoundType {
        userId
      }
      ... on CourseInProgressExceptionType {
        userId
      }
    }
  }
`

export const GET_USER_ENROLLMENT = gql`
  query GetUserEnrollments($userId: String!) {
    getUserEnrollments(params: {userId: $userId}) {
      ... on EnrollmentListType {
        enrollments {
          id
          userId
          courseId
          courseTitle
          courseStatus
          coursePercentage
          userLearningPathId
        }
      }
      ... on UserNotFoundType {
        userId
      }
    }
  }
`
