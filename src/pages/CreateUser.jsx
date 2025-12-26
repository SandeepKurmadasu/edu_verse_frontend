import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useMutation} from '@apollo/client'
import {CREATE_USER} from '../graphql/mutations'
import AppTitle from '../components/AppTitle'

export default function CreateUser() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    gender: '',
    email: '',
    phoneNumber: '',
  })

  const [message, setMessage] = useState('') // Fixed: only one setMessage
  const [createUser, {loading}] = useMutation(CREATE_USER)

  const handleChange = (e) => {
    setForm({...form, [e.target.name]: e.target.value})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      const res = await createUser({variables: {user: form}})
      const result = res.data.createUser

      if (result.userId) {
        setMessage('Account created successfully!')
        setTimeout(() => navigate('/login'), 1200)
      } else if (result.email) {
        setMessage('Email already exists')
      } else if (result.username) {
        setMessage('Username already exists')
      } else if (result.phoneNumber) {
        setMessage('Phone number already exists')
      }
    } catch (err) {
      setMessage('Error: ' + (err.message || 'Something went wrong'))
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f9f3e4]">
      {/* Background Illustration */}
      <div
        className="absolute inset-0 bg-cover bg-left bg-no-repeat"
        style={{
          backgroundImage: "url('/welcome-bg.png')",
          backgroundPosition: 'left center',
        }}
      />

      {/* Logo */}
      <div className="absolute top-8 left-8 z-30">
        <AppTitle />
      </div>

      {/* Form Card – perfectly fits in the empty space on the right */}
      <div className="flex min-h-screen items-center justify-end px-6 lg:px-16 xl:px-32">
        <div className="w-full max-w-md bg-[#f3e8d2]/96 backdrop-blur-sm shadow-2xl rounded-3xl p-8 lg:p-10 border border-[#e9dcc5]">
          <h1 className="text-4xl font-bold text-red-600 mb-4">
            Create Account
          </h1>

          <p className="text-gray-700 mb-8">
            Already have an account?{' '}
            <span
              onClick={() => navigate('/login')}
              className="text-red-600 font-semibold underline cursor-pointer hover:text-red-700"
            >
              Login
            </span>
          </p>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-center font-medium border ${
                message.includes('successfully')
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 bg-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition"
            />

            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 bg-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition"
            />

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter a strong password"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 bg-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition"
            />

            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition"
            >
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 bg-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition"
            />

            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="Enter your phone number"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 bg-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#f07d57] hover:bg-[#e86a41] disabled:opacity-60 text-white font-bold text-lg py-4 rounded-xl transition shadow-lg"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
