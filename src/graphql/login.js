import {gql} from '@apollo/client'

export const LOGIN_USER = gql`
  mutation UserLogin($params: UserLogInReqParams!) {
    userLogin(params: $params) {
      __typename
      ... on UserLoginResponseType {
        token
        user {
          userId
          email
          name
        }
      }
      ... on ExistingEmail {
        email
      }
      ... on NotExistedEmailFoundType {
        email
      }
      ... on WrongPasswordFoundType {
        password
      }
    }
  }
`
