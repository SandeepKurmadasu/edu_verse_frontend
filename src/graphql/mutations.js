import {gql} from '@apollo/client'

export const CREATE_USER = gql`
  mutation CreateUser($user: CreateUserInput!) {
    createUser(user: $user) {
      ... on UserType {
        userId
        name
        email
        username
        gender
        phoneNumber
        isActive
      }
      ... on ExistingEmail {
        email
      }
      ... on ExistingUserName {
        username
      }
      ... on ExistingPhoneNumber {
        phoneNumber
      }
    }
  }
`
