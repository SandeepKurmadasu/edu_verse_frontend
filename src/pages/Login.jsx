// src/pages/Login.jsx

import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useMutation} from '@apollo/client'
import {LOGIN_USER} from '../graphql/login'
import AppTitle from '../components/AppTitle'

export default function Login() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [loginUser, {loading}] = useMutation(LOGIN_USER)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      const res = await loginUser({
        variables: {
          params: {
            email: form.email,
            password: form.password,
          },
        },
      })

      const result = res.data.userLogin

      if (result.__typename === 'UserLoginResponseType') {
        setMessage('Login successful!')

        const userData = {
          userId: result.user.userId,
          email: result.user.email,
          name: result.user.name,
          token: result.token,
        }

        localStorage.setItem('user', JSON.stringify(userData))
        setTimeout(() => navigate('/'), 800)
      } else {
        setMessage('Invalid email or password')
      }
    } catch (err) {
      setMessage('Error: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-end">
      {/* Full-screen background image */}
      <div
        className="absolute inset-0 bg-cover bg-left bg-no-repeat"
        style={{
          backgroundImage: "url('/welcome-bg.png')",
          backgroundColor: '#f9f3e4', // your exact base color
        }}
      />

      {/* App Title - Top Left */}
      <div className="absolute top-8 left-8 z-10">
        <AppTitle />
      </div>

      {/* Login Card - Right Side */}
      <div className="relative z-10 mr-12 max-w-md w-full">
        <div className="bg-[#f3e8d2]/95 backdrop-blur-sm rounded-3xl p-10 shadow-2xl border border-[#e9dcc5]">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Login</h1>

          <p className="text-gray-700 mb-8 text-lg">
            Don't have an account?{' '}
            <span
              onClick={() => navigate('/signup')}
              className="text-red-600 font-semibold underline cursor-pointer hover:text-red-700"
            >
              Sign Up
            </span>
          </p>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-center font-medium border ${
                message.includes('successful')
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-800 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-5 py-4 rounded-xl border border-gray-300 bg-white focus:border-[#f07d57] focus:ring-4 focus:ring-orange-100 outline-none transition"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-800 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-5 py-4 rounded-xl border border-gray-300 bg-white focus:border-[#f07d57] focus:ring-4 focus:ring-orange-100 outline-none transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f07d57] hover:bg-[#e46f4a] text-white font-bold text-xl py-5 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
