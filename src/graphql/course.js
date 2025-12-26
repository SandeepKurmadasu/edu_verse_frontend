import {gql} from '@apollo/client'

export const GET_COURSE = gql`
  query GetCourse($courseIds: [String]!) {
    getCourses(params: {courseIds: $courseIds}) {
      ... on CoursesType {
        courses {
          courseId
          title
          description
          category
          level
          estimatedDuration
          averageRating
        }
      }
      ... on CourseIdsNotFound {
        courseIds
      }
    }
  }
`

export const GET_MODULES = gql`
  query GetModules($courseIds: [String]!) {
    getModules(params: {courseIds: $courseIds}) {
      ... on ModuleList {
        modules {
          moduleId
          courseId
          moduleTitle
          description
          order
          estimatedDurationInMins
        }
      }
    }
  }
`

export const GET_TOPICS_FOR_COURSE = gql`
  query GetTopicsForCourse($courseId: String!) {
    getTopicsForCourse(params: {courseId: $courseId}) {
      ... on TopicsListType {
        topics {
          topicId
          topicTitle
          description
          estimatedDurationInMins
          moduleId
          topicType
        }
      }
      ... on CourseNotFoundType {
        courseId
      }
    }
  }
`
