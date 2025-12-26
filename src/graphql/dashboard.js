import {gql} from '@apollo/client'

export const GET_USER = gql`
  query GetUser($userId: String!) {
    getUser(params: {userId: $userId}) {
      ... on UserType {
        userId
        name
        gender
        username
        email
        phoneNumber
        isActive
        otpCount
      }
      ... on UserNotFoundType {
        userId
      }
    }
  }
`

export const GET_USER_ENROLLMENTS = gql`
  query GetUserEnrollments($userId: String!) {
    getUserEnrollments(params: {userId: $userId}) {
      ... on EnrollmentListType {
        enrollments {
          id
          userId
          courseId
          courseStatus
          courseTitle
          coursePercentage
        }
      }
      ... on UserNotFoundType {
        userId
      }
    }
  }
`

export const GET_USER_RECOMMENDED = gql`
  query GetUserRecommendedCourses($userId: String!) {
    getUserRecommendedCourses(params: {userId: $userId}) {
      ... on CoursesType {
        courses {
          courseId
          title
          description
          category
          level
          averageRating
          estimatedDuration
        }
      }
      ... on UserNotFoundType {
        userId
      }
    }
  }
`

// export const GET_USER = gql`
//   query GetUser($userId: ID!) {
//     getUser(userId: $userId) {
// userId
// name
// gender
// username
// email
// phoneNumber
// isActive
// otpCount
// password # <--- Make sure 'password' is included here
//     }
//   }
// `;
