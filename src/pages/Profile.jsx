import React, {useState, useEffect} from 'react'
import {useQuery, useMutation, gql} from '@apollo/client'
import {useNavigate} from 'react-router-dom'
import {GET_USER} from '../graphql/dashboard'
import AppTitle from '../components/AppTitle'

// ✅ CORRECTED GraphQL mutation - phoneNumber as String!
const UPDATE_USER = gql`
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
      ... on UserNotFoundType {
        userId
      }
      ... on ExistedUsernameFoundType {
        username
      }
      ... on ExistedEmailFoundType {
        email
      }
      ... on ExistedPhoneNumberFoundType {
        phoneNumber
      }
    }
  }
`

export default function Profile() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    gender: 'OTHER',
    username: '',
    password: '',
  })
  const [error, setError] = useState('')

  // Get userId from localStorage
  const stored = localStorage.getItem('user')
  const userId = stored ? JSON.parse(stored).userId : null

  const {
    data: userData,
    loading,
    refetch,
  } = useQuery(GET_USER, {
    variables: {userId: userId ?? ''},
    skip: !userId,
    fetchPolicy: 'network-only',
  })

  const user = userData?.getUser || null

  const [updateUser, {loading: updating}] = useMutation(UPDATE_USER, {
    onCompleted: (data) => {
      console.log('✅ Update successful:', data)
      refetch()
      setIsEditing(false)
      setError('')
    },
    onError: (err) => {
      console.error('❌ Update error:', JSON.stringify(err, null, 2))
      setError(err.message || 'Failed to update profile')
    },
  })

  // ✅ FIXED: phoneNumber always as String
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: String(user.phoneNumber || ''), // ✅ Always String
        gender: user.gender || 'OTHER',
        username: user.username || '',
        password: user.password || '',
      })
    }
  }, [user])

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f3e4]">
        <p className="text-gray-600">Please login to view profile</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f3e4]">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f3e4]">
        <p className="text-red-600">User not found</p>
      </div>
    )
  }

  const handleChange = (e) => {
    const {name, value} = e.target
    setForm((prev) => ({...prev, [name]: value}))
  }

  // ✅ FIXED: phoneNumber as String (not Number)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    await updateUser({
      variables: {
        params: {
          userId: user.userId,
          name: form.name,
          gender: form.gender,
          username: form.username,
          password: form.password,
          email: form.email,
          phoneNumber: form.phoneNumber || '', // ✅ String!
        },
      },
    })
  }

  const toggleEdit = () => {
    if (isEditing) {
      // Reset to original values on cancel
      setForm({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: String(user.phoneNumber || ''),
        gender: user.gender || 'OTHER',
        username: user.username || '',
        password: user.password || '',
      })
      setError('')
    }
    setIsEditing((prev) => !prev)
  }

  return (
    <div className="min-h-screen bg-[#f9f3e4]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <AppTitle />
          <button
            onClick={() => navigate('/')}
            className="text-[#f07d57] hover:underline font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#efe7db] overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#f07d57] to-[#ff9a76] p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-white/90 flex items-center justify-center text-4xl font-bold text-[#f07d57] shadow-lg">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold">{user.name}</h1>
                <p className="text-white/90 mt-1">@{user.username}</p>
                {user.isActive ? (
                  <span className="inline-block mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded-full">
                    ✓ Active
                  </span>
                ) : (
                  <span className="inline-block mt-2 px-3 py-1 bg-gray-400 text-white text-xs rounded-full">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Profile Information
            </h2>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            {isEditing ? (
              /* EDIT FORM - Prefilled with current values */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db] focus:outline-none focus:ring-2 focus:ring-[#f07d57]/50"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db] focus:outline-none focus:ring-2 focus:ring-[#f07d57]/50"
                    />
                  </div>

                  {/* Phone - String input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={form.phoneNumber}
                      onChange={handleChange}
                      className="w-full p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db] focus:outline-none focus:ring-2 focus:ring-[#f07d57]/50"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">
                      Gender *
                    </label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      required
                      className="w-full p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db] focus:outline-none focus:ring-2 focus:ring-[#f07d57]/50"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex-1 px-6 py-3 bg-[#f07d57] text-white rounded-xl font-medium hover:bg-[#e46f4a] transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleEdit}
                    disabled={updating}
                    className="flex-1 px-6 py-3 border-2 border-[#f07d57] text-[#f07d57] rounded-xl font-medium hover:bg-[#fff4ee] transition disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* READ-ONLY VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">
                    Full Name
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db]">
                    <span className="text-xl">👤</span>
                    <span className="text-gray-800 font-medium">
                      {user.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">
                    Username
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db]">
                    <span className="text-xl">@</span>
                    <span className="text-gray-800 font-medium">
                      {user.username}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db]">
                    <span className="text-xl">✉️</span>
                    <span className="text-gray-800 font-medium">
                      {user.email}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db]">
                    <span className="text-xl">📱</span>
                    <span className="text-gray-800 font-medium">
                      {user.phoneNumber || 'Not provided'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">
                    Gender
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db]">
                    <span className="text-xl">
                      {user.gender === 'MALE'
                        ? '👨'
                        : user.gender === 'FEMALE'
                        ? '👩'
                        : '👤'}
                    </span>
                    <span className="text-gray-800 font-medium capitalize">
                      {user.gender?.toLowerCase() || 'Not specified'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">
                    Password
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-[#fff4ee] rounded-xl border border-[#efe7db]">
                    <span className="text-xl">🔒</span>
                    <span className="text-gray-800 font-medium flex-1">
                      {showPassword ? '********' : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#f07d57] hover:text-[#e46f4a] transition-all"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Account Status */}
            <div className="mt-8 pt-6 border-t border-[#efe7db]">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Account Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#fff4ee] rounded-xl">
                  <p className="text-sm text-gray-500">Account Status</p>
                  <p className="text-lg font-semibold text-gray-800 mt-1">
                    {user.isActive ? '✅ Active' : '❌ Inactive'}
                  </p>
                </div>
                <div className="p-4 bg-[#fff4ee] rounded-xl">
                  <p className="text-sm text-gray-500">OTP Count</p>
                  <p className="text-lg font-semibold text-gray-800 mt-1">
                    {user.otpCount || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isEditing && (
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-3 bg-[#f07d57] text-white rounded-xl font-medium hover:bg-[#e46f4a] transition-all shadow-lg"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={toggleEdit}
                  className="flex-1 px-6 py-3 border-2 border-[#f07d57] text-[#f07d57] rounded-xl font-medium hover:bg-[#fff4ee] hover:border-[#e46f4a] hover:text-[#e46f4a] transition-all"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
