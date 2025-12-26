import React, {useEffect} from 'react'
import {useQuery} from '@apollo/client'
import {
  GET_USER,
  GET_USER_ENROLLMENTS,
  GET_USER_RECOMMENDED,
} from '../graphql/dashboard'
import AppTitle from '../components/AppTitle'
import {useNavigate} from 'react-router-dom'

/* ----------------- TopBar ----------------- */
function TopBar({name}) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="w-full flex items-center justify-between py-4 px-6 bg-transparent">
      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
          <AppTitle />
        </div>
        <div className="ml-3">
          <p className="text-sm text-gray-600">Welcome back,</p>
          <h2 className="text-xl font-semibold text-gray-800">
            {name || 'Learner'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="px-3 py-2 rounded-lg text-sm border border-transparent hover:bg-white/60"
        >
          Profile
        </button>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg bg-[#f07d57] text-white font-medium hover:bg-[#e46f4a]"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

/* ----------------- CourseCard (My Courses) ----------------- */
function CourseCard({c}) {
  const navigate = useNavigate()

  const percentage = c.coursePercentage ?? 0
  const status = c.courseStatus || 'IN_PROGRESS'

  // Decide label to show
  let statusLabel = status
  if (percentage === 100 && status.toUpperCase() !== 'FAIL') {
    statusLabel = 'Completed'
  }

  return (
    <div
      onClick={() => navigate(`/course/${c.courseId}`)}
      className="cursor-pointer bg-white/90 p-4 rounded-2xl shadow-sm border border-[#efe7db] w-full hover:shadow-lg hover:scale-[1.02] transition"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-lg bg-[#fff4ee] flex items-center justify-center text-2xl font-bold text-[#f07d57]">
          {(c.courseTitle || c.title || 'C').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">
            {c.courseTitle || c.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {c.description?.slice(0, 110)}
          </p>

          <div className="mt-3">
            <div className="w-full bg-[#efe6d8] rounded-full h-3">
              <div
                className="h-3 rounded-full bg-[#f07d57]"
                style={{width: `${percentage}%`}}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{percentage}% complete</span>
              <span>{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------- RecommendedCard (COURSE ONLY) ----------------- */
function RecommendedCard({course}) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/course/${course.courseId}`)}
      className="cursor-pointer bg-white/95 p-4 rounded-2xl shadow-sm border border-[#efe7db] w-full hover:shadow-lg hover:scale-[1.02] transition"
    >
      {/* Simple thumbnail */}
      <div className="h-28 rounded-md bg-gradient-to-br from-[#fff7f2] to-[#fff2ec] flex items-center justify-center text-3xl text-[#f07d57]">
        📘
      </div>

      {/* Only course-level fields */}
      <h4 className="mt-3 text-md font-semibold text-gray-800">
        {course.title}
      </h4>

      <p className="text-xs text-gray-500 mt-1">
        {course.category || 'General'}
      </p>

      <div className="mt-3 flex justify-between items-center">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/course/${course.courseId}`)
          }}
          className="px-3 py-1 rounded-md bg-[#f07d57] text-white text-sm"
        >
          View
        </button>

        <span className="text-xs text-gray-500">
          {course.estimatedDuration}m
        </span>
      </div>
    </div>
  )
}

/* ----------------- Dashboard ----------------- */
export default function Dashboard() {
  const navigate = useNavigate()

  const stored = localStorage.getItem('user')
  let userId = null
  try {
    userId = stored
      ? JSON.parse(stored).userId || JSON.parse(stored).email || null
      : null
  } catch (e) {
    userId = null
  }

  const {
    data: userData,
    loading: userLoading,
    error: userError,
  } = useQuery(GET_USER, {
    variables: {userId: userId ?? ''},
    skip: !userId,
    fetchPolicy: 'network-only',
  })

  const {
    data: enrollData,
    loading: enrollLoading,
    error: enrollError,
  } = useQuery(GET_USER_ENROLLMENTS, {
    variables: {userId: userId ?? ''},
    skip: !userId,
    fetchPolicy: 'network-only',
  })

  const {
    data: recData,
    loading: recLoading,
    error: recError,
  } = useQuery(GET_USER_RECOMMENDED, {
    variables: {userId: userId ?? ''},
    skip: !userId,
    fetchPolicy: 'network-only',
  })

  useEffect(() => {
    if (userError) console.error('GET_USER Error:', userError)
    if (enrollError) console.error('GET_USER_ENROLLMENTS Error:', enrollError)
    if (recError) console.error('GET_USER_RECOMMENDED Error:', recError)
  }, [userError, enrollError, recError])

  useEffect(() => {
    if (!userId) {
      navigate('/login', {replace: true})
    }
  }, [userId, navigate])

  const user = userData?.getUser?.userId ? userData.getUser : null
  const enrollments = enrollData?.getUserEnrollments?.enrollments ?? []
  const rec = recData?.getUserRecommendedCourses?.courses ?? []

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f3e4]">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    )
  }

  if (userError || enrollError || recError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f3e4]">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Error loading dashboard</p>
          <p className="text-gray-600 text-sm mt-2">
            {userError?.message || enrollError?.message || recError?.message}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-[#f07d57] text-white rounded-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f3e4]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <TopBar name={user?.name ?? user?.username ?? 'Learner'} />

        <main className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: My courses + summary */}
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-[#f3e8d2] rounded-3xl p-6 shadow-sm border border-[#e8dcc5]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Welcome back, {user?.name ?? user?.username ?? 'Learner'} 👋
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Continue your learning journey
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="px-4 py-2 rounded-lg bg-white/90 border border-[#f07d57] text-[#f07d57]"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Your Courses
              </h3>
              {enrollLoading ? (
                <p className="text-gray-500">Loading courses...</p>
              ) : enrollments.length === 0 ? (
                <p className="text-gray-500">No enrolled courses yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrollments.map((e) => (
                    <CourseCard key={e.id} c={e} />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#efe7db]">
              <h4 className="font-semibold text-gray-800">Continue Learning</h4>
              <p className="text-sm text-gray-600 mt-2">
                Resume your last active course or assessment.
              </p>
            </div>
          </section>

          {/* Right: Stats + recommended */}
          <aside className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#efe7db] shadow-sm">
                <p className="text-sm text-gray-500">Courses Enrolled</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {enrollments.length}
                </h3>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#efe7db] shadow-sm">
                <p className="text-sm text-gray-500">Recommended for you</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {rec.length}
                </h3>
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-800 mb-3">
                Recommended
              </h4>
              {recLoading ? (
                <p className="text-gray-500">Loading recommended...</p>
              ) : rec.length === 0 ? (
                <p className="text-gray-500">No recommendations yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {rec.slice(0, 4).map((course) => (
                    <RecommendedCard key={course.courseId} course={course} />
                  ))}
                </div>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
