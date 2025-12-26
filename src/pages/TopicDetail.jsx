import {useParams, useNavigate} from 'react-router-dom'
import {useQuery, useMutation} from '@apollo/client'
import {GET_TOPIC} from '../graphql/topic'
import {GET_TOPIC_VIDEO} from '../graphql/topicVideo'
import {GET_USER_ENROLLMENT} from '../graphql/enrollment'
import {GET_LEARNING_UNITS_BY_PATH} from '../graphql/learning'
import {UPDATE_LEARNING_UNIT_PROGRESS} from '../graphql/learningUnit'
import {
  GET_ASSESSMENT_BY_TOPIC,
  START_ASSESSMENT_ATTEMPT,
  GET_LATEST_ATTEMPT,
} from '../graphql/assessment'
import AppTitle from '../components/AppTitle'
import {useState, useMemo, useEffect} from 'react'

export default function TopicDetail() {
  const {topicId, courseId} = useParams()
  const navigate = useNavigate()
  const [marking, setMarking] = useState(false)
  const [startingQuiz, setStartingQuiz] = useState(false)
  const [showAttemptsModal, setShowAttemptsModal] = useState(false)
  const [attemptsExhausted, setAttemptsExhausted] = useState(false)

  const stored = localStorage.getItem('user')
  const userId = stored ? JSON.parse(stored).userId : null

  const {data: topicData, loading: topicLoading} = useQuery(GET_TOPIC, {
    variables: {topicId},
  })

  const topic = topicData?.getTopics?.topics?.[0] || null
  const isAssessment = topic?.topicType === 'ASSESSMENT'

  const {data: videoData, loading: videoLoading} = useQuery(GET_TOPIC_VIDEO, {
    variables: {topicId},
    skip: !topicId || isAssessment,
    fetchPolicy: 'network-only',
  })

  const {data: enrollmentData} = useQuery(GET_USER_ENROLLMENT, {
    variables: {userId},
    skip: !userId,
  })

  const userLearningPathId = useMemo(() => {
    const enrollments = enrollmentData?.getUserEnrollments?.enrollments || []
    const enrollment = enrollments.find((e) => e.courseId === courseId)
    return enrollment?.userLearningPathId
  }, [enrollmentData, courseId])

  // ✅ FIX: Add polling and network-only to always get fresh data
  const {
    data: learningUnitsData,
    refetch: refetchLearningUnits,
    loading: learningUnitsLoading,
  } = useQuery(GET_LEARNING_UNITS_BY_PATH, {
    variables: {userLearningPathId},
    skip: !userLearningPathId,
    fetchPolicy: 'network-only', // ✅ Always fetch from server
    notifyOnNetworkStatusChange: true,
  })

  const currentLearningUnit = useMemo(() => {
    const units = learningUnitsData?.getUserLearningUnits?.units || []
    return units.find((unit) => unit.topicId === topicId)
  }, [learningUnitsData, topicId])

  const userLearningUnitId = currentLearningUnit?.userLearningUnitId
  const currentStatus = currentLearningUnit?.status
  const currentPercentage = currentLearningUnit?.percentage || 0

  const {data: assessmentData, loading: assessmentLoading} = useQuery(
    GET_ASSESSMENT_BY_TOPIC,
    {
      variables: {topicId},
      skip: !isAssessment || !topicId,
      fetchPolicy: 'network-only',
    },
  )

  const assessment = assessmentData?.getAssessmentByTopic

  const {
    data: latestAttemptData,
    loading: latestAttemptLoading,
    refetch: refetchLatestAttempt,
  } = useQuery(GET_LATEST_ATTEMPT, {
    variables: {
      params: {
        userId: userId,
        assessmentId: assessment?.assessmentId,
      },
    },
    skip: !userId || !assessment?.assessmentId || !isAssessment,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })

  const latestAttempt =
    latestAttemptData?.getLatestAttempt?.__typename === 'AssessmentAttemptType'
      ? latestAttemptData.getLatestAttempt
      : null

  const totalPoints = assessment?.marks || assessment?.noOfQuestions * 10
  const passMarkPoints =
    assessment?.passMarks ||
    Math.round((assessment?.passPercentage / 100) * totalPoints)

  // ✅ Aggressively refetch on mount - run immediately when component loads
  useEffect(() => {
    console.log('🔄 TopicDetail mounted - forcing data refresh...')

    if (userLearningPathId) {
      refetchLearningUnits()
    }

    if (isAssessment && assessment?.assessmentId && userId) {
      refetchLatestAttempt()
    }
  }, []) // Empty deps = run once on mount

  // ✅ Also refetch when key values change
  useEffect(() => {
    if (isAssessment && assessment?.assessmentId && userId) {
      console.log('🔄 Assessment data changed - refetching...')
      refetchLatestAttempt()
      refetchLearningUnits()
    }
  }, [isAssessment, assessment?.assessmentId, userId])

  // ✅ Also refetch when tab becomes visible (user comes back after quiz)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        !document.hidden &&
        isAssessment &&
        assessment?.assessmentId &&
        userId
      ) {
        console.log('🔄 Tab visible - refetching data...')
        refetchLatestAttempt()
        refetchLearningUnits()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [
    isAssessment,
    assessment?.assessmentId,
    userId,
    refetchLatestAttempt,
    refetchLearningUnits,
  ])

  const [startAttempt] = useMutation(START_ASSESSMENT_ATTEMPT, {
    onCompleted: (data) => {
      const result = data.createAttempt

      if (result.__typename === 'AssessmentAttemptType') {
        // ✅ Save both courseId and topicId before navigating
        localStorage.setItem('currentCourseId', courseId)
        localStorage.setItem('currentTopicId', topicId)
        localStorage.setItem(
          'assessmentDuration',
          assessment.estimateDurationInMins,
        ) // ✅ ADD THIS LINE

        navigate(
          `/assessment/${assessment.assessmentId}/attempt/${result.attemptId}`,
        )
      } else if (result.__typename === 'AttemptsCompletedType') {
        setAttemptsExhausted(true)
        setShowAttemptsModal(true)
        setStartingQuiz(false)
      } else if (result.__typename === 'AssessmentNotFoundType') {
        alert('Assessment not found')
        setStartingQuiz(false)
      }
    },
    onError: (error) => {
      console.error('Start attempt error:', error)
      alert('Failed to start quiz: ' + error.message)
      setStartingQuiz(false)
    },
  })

  const [updateProgress] = useMutation(UPDATE_LEARNING_UNIT_PROGRESS, {
    onCompleted: (data) => {
      const result = data.updateLearningUnitProgress

      if (result.__typename === 'UpdateLearningUnitProgressType') {
        console.log('✅ Progress updated successfully!')
        refetchLearningUnits()
        refetchLatestAttempt()
      } else if (result.__typename === 'UserLearningUnitIdNotFoundType') {
        console.error('❌ Error: Learning unit not found')
      } else if (result.__typename === 'LearningUnitLockedExceptionType') {
        console.error('❌ Error: This unit is locked')
      }
    },
    onError: (error) => {
      console.error('❌ Update progress error:', error)
    },
    refetchQueries: ['GET_LEARNING_UNITS_BY_PATH'],
    awaitRefetchQueries: true,
  })

  // ✅ ✅ ✅ THIS IS THE MISSING PIECE - Auto-update learning unit when attempt is completed
  useEffect(() => {
    console.log('🔍 Checking auto-update conditions:', {
      latestAttempt: latestAttempt?.status,
      userLearningPathId,
      userLearningUnitId,
      currentStatus,
    })

    // Guard clauses - exit early if conditions not met
    if (!latestAttempt) {
      console.log('⏭️ No latest attempt yet')
      return
    }

    if (latestAttempt.status !== 'COMPLETE') {
      console.log('⏭️ Attempt not complete yet:', latestAttempt.status)
      return
    }

    if (!userLearningPathId || !userLearningUnitId) {
      console.log('⏭️ Missing learning path or unit IDs')
      return
    }

    if (currentStatus === 'COMPLETE') {
      console.log('⏭️ Learning unit already marked as complete')
      return
    }

    // Check if user passed (optional - you can remove this if you want to unlock regardless)
    const userScore = latestAttempt.totalPoints || 0
    const passed = userScore >= passMarkPoints

    console.log('📊 Attempt evaluation:', {
      userScore,
      passMarkPoints,
      passed,
      status: latestAttempt.status,
    })

    // ✅ UPDATE: Mark as complete REGARDLESS of pass/fail
    console.log('🎯 Attempt completed! Updating learning unit to COMPLETE...')
    console.log(
      passed
        ? '🎉 User PASSED the assessment!'
        : '❌ User FAILED but unlocking next unit anyway',
    )

    updateProgress({
      variables: {
        params: {
          userLearningPathId: userLearningPathId,
          userLearningUnitId: userLearningUnitId,
          status: 'COMPLETE',
          percentage: 100,
        },
      },
    })
  }, [
    latestAttempt,
    latestAttempt?.status,
    latestAttempt?.totalPoints,
    userLearningPathId,
    userLearningUnitId,
    currentStatus,
    passMarkPoints,
    updateProgress,
  ])

  const handleStartQuiz = async () => {
    if (!userId || !assessment?.assessmentId) {
      alert('Unable to start quiz. Please try again.')
      return
    }

    setStartingQuiz(true)

    try {
      await startAttempt({
        variables: {
          params: {
            userId: userId,
            assessmentId: assessment.assessmentId,
          },
        },
      })
    } catch (err) {
      console.error('Start quiz error:', err)
      setStartingQuiz(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!userLearningPathId || !userLearningUnitId) {
      alert('Please enroll in this course first!')
      navigate(`/course/${courseId}`)
      return
    }

    setMarking(true)

    try {
      await updateProgress({
        variables: {
          params: {
            userLearningPathId: userLearningPathId,
            userLearningUnitId: userLearningUnitId,
            status: 'COMPLETE',
            percentage: 100,
          },
        },
      })

      alert('Topic marked as completed! 🎉')
      refetchLearningUnits()
      setTimeout(() => {
        navigate(`/course/${courseId}`)
      }, 500)
      setMarking(false)
    } catch (err) {
      console.error('Mark complete error:', err)
      alert('Failed to mark as completed: ' + err.message)
      setMarking(false)
    }
  }

  const videoResponse = videoData?.getTopicVideo
  const videoUrl =
    videoResponse?.__typename === 'TopicVideoType'
      ? videoResponse.videoUrl
      : null

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null

    try {
      const watchMatch = url.match(/v=([^&]+)/)
      if (watchMatch) {
        return `https://www.youtube.com/embed/${watchMatch[1]}`
      }

      const shortMatch = url.match(/youtu\.be\/([^?]+)/)
      if (shortMatch) {
        return `https://www.youtube.com/embed/${shortMatch[1]}`
      }

      if (url.includes('youtube.com/embed')) {
        return url
      }

      return null
    } catch (e) {
      return null
    }
  }

  const embedUrl = getYouTubeEmbedUrl(videoUrl)

  const isCompleted = currentStatus === 'COMPLETE'
  const isLocked = currentLearningUnit?.isLocked ?? true

  // ✅ Show loading state while fetching critical data
  if (
    (topicLoading ||
      videoLoading ||
      learningUnitsLoading ||
      (isAssessment && (assessmentLoading || latestAttemptLoading))) &&
    !topicData
  ) {
    return (
      <div className="min-h-screen bg-[#f9f3e4] flex items-center justify-center">
        <div className="text-xl text-gray-700">Loading...</div>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">
        Topic not found
      </div>
    )
  }

  if (isLocked && !isAssessment) {
    return (
      <div className="min-h-screen bg-[#f9f3e4] flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl border border-[#efe7db] p-10 text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Topic Locked
          </h2>
          <p className="text-gray-600 mb-6">
            Complete previous topics to unlock this one.
          </p>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="px-6 py-3 bg-[#f07d57] text-white rounded-xl hover:bg-[#e46f4a]"
          >
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  // ASSESSMENT VIEW
  if (isAssessment && assessment?.__typename === 'AssessmentType') {
    return (
      <div className="min-h-screen bg-[#f9f3e4] py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <AppTitle />
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="text-[#f07d57] hover:underline font-medium"
            >
              ← Back to Course
            </button>
          </div>

          {showAttemptsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full transform transition-all">
                <div className="text-center">
                  <div className="text-6xl mb-4">🚫</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    Attempts Limit Reached
                  </h2>
                  <p className="text-gray-600 mb-6">
                    You've used all <strong>{assessment.attemptsLimit}</strong>{' '}
                    attempts for this assessment. You cannot retake this quiz.
                  </p>
                  <button
                    onClick={() => {
                      setShowAttemptsModal(false)
                      navigate(`/course/${courseId}`)
                    }}
                    className="w-full px-6 py-3 bg-[#f07d57] text-white rounded-xl hover:bg-[#e46f4a] font-medium transition-all"
                  >
                    Back to Course
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-xl border border-[#efe7db] p-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#f07d57] to-[#ff9a76]">
                  {assessment.icon ? (
                    <img
                      src={assessment.icon}
                      alt="Assessment Icon"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl text-white">📝</span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-800">
                    {assessment.assessmentTitle}
                  </h1>
                  <p className="text-gray-500 mt-1">
                    {assessment.assessmentType}
                  </p>
                </div>
              </div>
              {isCompleted && (
                <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                  ✓ Completed
                </span>
              )}
            </div>

            <p className="text-gray-600 text-lg mb-8">
              {assessment.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border-2 border-[#f07d57] shadow-lg">
              <div className="text-center">
                <p className="text-base text-gray-600 mb-2 font-medium">
                  Total Marks
                </p>
                <div className="text-4xl md:text-5xl font-bold text-gray-900">
                  {totalPoints}
                </div>
              </div>
              <div className="text-center">
                <p className="text-base text-gray-600 mb-2 font-medium">
                  Pass Mark
                </p>
                <div className="text-4xl md:text-5xl font-bold text-[#f07d57]">
                  {passMarkPoints}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-[#fff4ee] p-6 rounded-2xl text-center shadow-sm">
                <p className="text-sm text-gray-500 mb-3">🧮 Questions</p>
                <p className="text-3xl font-bold text-gray-800">
                  {assessment.noOfQuestions}
                </p>
              </div>
              <div className="bg-[#fff4ee] p-6 rounded-2xl text-center shadow-sm">
                <p className="text-sm text-gray-500 mb-3">⏱️ Duration</p>
                <p className="text-3xl font-bold text-gray-800">
                  {assessment.estimateDurationInMins}m
                </p>
              </div>
              <div className="bg-[#fff4ee] p-6 rounded-2xl text-center shadow-sm">
                <p className="text-sm text-gray-500 mb-3">🔄 Attempts</p>
                <p className="text-3xl font-bold text-gray-800">
                  {assessment.attemptsLimit}
                </p>
              </div>
              <div className="bg-[#fff4ee] p-6 rounded-2xl text-center shadow-sm">
                <p className="text-sm text-gray-500 mb-3">📊 Difficulty</p>
                <span className="text-xl font-bold text-gray-800">
                  {assessment.easyCount || 0}E/{assessment.mediumCount || 0}M/
                  {assessment.hardCount || 0}H
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-xl mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                📋 Instructions
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  • You have{' '}
                  <strong>
                    {assessment.attemptsLimit} attempt
                    {assessment.attemptsLimit === 1 ? '' : 's'}
                  </strong>{' '}
                  for this assessment
                </li>
                <li>
                  • Duration:{' '}
                  <strong>{assessment.estimateDurationInMins} minutes</strong>
                </li>
                <li>
                  • Pass mark: <strong>{assessment.passPercentage}%</strong>
                </li>
                <li>• Read each question carefully before answering</li>
                <li>• You cannot pause once started</li>
                <li>
                  • Do not use the browser back button or swipe back during the
                  assessment
                </li>
                <li></li>
              </ul>
            </div>

            {latestAttempt && latestAttempt.status === 'COMPLETE' && (
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-400 rounded-xl p-6 mb-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  📊 Your Latest Attempt Result
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex justify-center">
                    <div className="relative w-36 h-36">
                      <svg className="transform -rotate-90 w-36 h-36">
                        <circle
                          cx="72"
                          cy="72"
                          r="66"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                          fill="none"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="66"
                          stroke={
                            (latestAttempt.totalPoints || 0) >= passMarkPoints
                              ? 'url(#gradient-green)'
                              : 'url(#gradient-red)'
                          }
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={`${
                            2 *
                            Math.PI *
                            66 *
                            ((latestAttempt.totalPoints || 0) / totalPoints)
                          } ${2 * Math.PI * 66}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient
                            id="gradient-green"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                          <linearGradient
                            id="gradient-red"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#dc2626" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl font-black text-gray-800">
                          {Math.round(
                            ((latestAttempt.totalPoints || 0) / totalPoints) *
                              100,
                          )}
                          %
                        </div>
                        <div className="text-base font-bold text-gray-600 mt-1">
                          {latestAttempt.totalPoints || 0}/{totalPoints}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">
                        Result Status
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          (latestAttempt.totalPoints || 0) >= passMarkPoints
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {(latestAttempt.totalPoints || 0) >= passMarkPoints
                          ? '✅ Passed'
                          : '❌ Failed'}
                      </p>
                      {(latestAttempt.totalPoints || 0) >= passMarkPoints ? (
                        <p className="text-xs text-green-600 mt-1">
                          You scored above the pass mark!
                        </p>
                      ) : (
                        <p className="text-xs text-red-600 mt-1">
                          Need{' '}
                          {passMarkPoints - (latestAttempt.totalPoints || 0)}{' '}
                          more points
                        </p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Attempt Date</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {new Date(latestAttempt.startedAt).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-[#efe7db] gap-3">
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="px-8 py-3 border-2 border-[#f07d57] text-[#f07d57] rounded-xl hover:bg-[#fff0ea] font-medium transition-all w-full sm:w-auto"
              >
                ← Back to Course
              </button>

              {isLocked ? (
                <div className="px-10 py-3 rounded-xl font-medium bg-gray-100 text-gray-500 w-full sm:w-auto text-center">
                  🔒 Complete previous topics to unlock
                </div>
              ) : (
                <button
                  onClick={handleStartQuiz}
                  disabled={startingQuiz || attemptsExhausted}
                  className={`px-10 py-3 rounded-xl font-medium transition-all ${
                    attemptsExhausted
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : startingQuiz
                      ? 'bg-gray-400 text-white cursor-wait'
                      : 'bg-[#f07d57] text-white hover:bg-[#e46f4a]'
                  } w-full sm:w-auto`}
                >
                  {startingQuiz
                    ? 'Starting...'
                    : attemptsExhausted
                    ? '✗ No Attempts Left'
                    : '🚀 Start Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // REGULAR LEARNING TOPIC VIEW
  return (
    <div className="min-h-screen bg-[#f9f3e4] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <AppTitle />
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="text-[#f07d57] hover:underline font-medium"
          >
            ← Back to Course
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-[#efe7db] p-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold text-gray-800">{topic.title}</h1>
            {isCompleted && (
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                ✓ Completed
              </span>
            )}
          </div>

          <div className="flex items-center gap-6 text-gray-600 text-sm mb-10">
            <span className="bg-gray-100 px-4 py-2 rounded-full font-medium">
              {topic.topicType}
            </span>
            <span>{topic.estimatedDurationInMins} mins</span>
            {currentPercentage > 0 && (
              <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-medium">
                {currentPercentage}% Complete
              </span>
            )}
          </div>

          {!isAssessment && (
            <>
              {videoLoading ? (
                <div className="bg-gray-50 rounded-2xl p-12 text-center mb-10">
                  <div className="text-2xl mb-4">⏳</div>
                  <p className="text-gray-500">Loading video...</p>
                </div>
              ) : videoUrl ? (
                <div className="mb-10">
                  {embedUrl ? (
                    <iframe
                      width="100%"
                      height="450"
                      src={embedUrl}
                      title={topic.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-2xl shadow-xl w-full"
                    />
                  ) : (
                    <video
                      controls
                      className="w-full rounded-2xl shadow-xl"
                      src={videoUrl}
                    />
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-12 text-center mb-10">
                  <div className="text-6xl mb-4">📹</div>
                  <p className="text-gray-500">
                    No video available for this topic
                  </p>
                </div>
              )}

              <hr className="border-[#efe7db] my-10" />
            </>
          )}

          <div
            className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: topic.content || 'No content available.',
            }}
          />

          <div className="mt-12 flex flex-col sm:flex-row justify-between pt-10 border-t border-[#efe7db] gap-4">
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="px-8 py-4 border-2 border-[#f07d57] text-[#f07d57] rounded-2xl hover:bg-[#fff0ea] font-semibold w-full sm:w-auto"
            >
              ← Back to Course
            </button>

            <button
              onClick={handleMarkComplete}
              disabled={isCompleted || marking}
              className={`px-12 py-4 rounded-2xl font-semibold shadow-lg transition-all transform hover:scale-105 w-full sm:w-auto ${
                isCompleted
                  ? 'bg-green-500 text-white cursor-default'
                  : marking
                  ? 'bg-gray-400 text-white cursor-wait'
                  : 'bg-gradient-to-r from-[#f07d57] to-[#ff9a76] text-white hover:from-[#e46f4a] hover:shadow-xl hover:to-[#ff8a60]'
              }`}
            >
              {marking
                ? '⏳ Marking...'
                : isCompleted
                ? '✅ Completed'
                : '🎯 Mark as Completed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
