import {ApolloClient, InMemoryCache, HttpLink} from '@apollo/client'

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'http://localhost:8000/graphql/',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    fetchOptions: {
      mode: 'cors',
    },
  }),
  cache: new InMemoryCache(),
})

export default client
