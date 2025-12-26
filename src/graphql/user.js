// src/graphql/user.js
export const UPDATE_USER = gql`
  mutation UpdateUser($params: UpdateUserReqParams!) {
    updateUser(params: $params) {
      ... on UserType {
        userId
        name
        gender
        email
        phoneNumber
        username
        isActive
        otpCount
      }
    }
  }
`
