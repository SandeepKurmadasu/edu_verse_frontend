// src/pages/QuizAttempt.jsx – Fixed real-time updates (shows latest attempt only)

import {useParams, useNavigate} from 'react-router-dom'
import {useQuery, useMutation, useApolloClient} from '@apollo/client'
import {useState, useEffect, useRef} from 'react'
import AppTitle from '../components/AppTitle'
import {
  GET_NEXT_QUESTION,
  SUBMIT_ANSWER,
  ATTEMPT_END,
  GET_ATTEMPT_SCORE,
} from '../graphql/quiz'
import {GET_USER_ENROLLMENT} from '../graphql/enrollment'
import {GET_LEARNING_UNITS_BY_PATH} from '../graphql/learning'
import {UPDATE_LEARNING_UNIT_PROGRESS} from '../graphql/learningUnit'

export default function QuizAttempt() {
  const {assessmentId, attemptId} = useParams()
  const navigate = useNavigate()
  const apolloClient = useApolloClient() // ✅ Get Apollo Client instance
  const stored = localStorage.getItem('user')
  const userId = stored ? JSON.parse(stored).userId : null

  const courseId = localStorage.getItem('currentCourseId')
  const topicId = localStorage.getItem('currentTopicId')

  const storedDuration = localStorage.getItem('assessmentDuration')
  const EXAM_DURATION_MINUTES = storedDuration ? parseInt(storedDuration) : 30

  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [totalScore, setTotalScore] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_MINUTES * 60)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scoreFlash, setScoreFlash] = useState(null)
  const [answerFeedback, setAnswerFeedback] = useState(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [isFinishing, setIsFinishing] = useState(false)

  const hasFinishedRef = useRef(false)

  const [mcqSingle, setMcqSingle] = useState('')
  const [mcqMulti, setMcqMulti] = useState([])
  const [textAnswer, setTextAnswer] = useState('')
  const [trueFalse, setTrueFalse] = useState('')
  const [matchPairs, setMatchPairs] = useState([])

  const rawQuestionType = currentQuestion?.questionType || ''
  const questionType = rawQuestionType.replace('QuestionTypeDTO.', '')
  const hasOptions =
    currentQuestion?.options && currentQuestion.options.length > 0

  const {
    data: questionData,
    refetch: refetchNextQuestion,
    loading: questionLoading,
    error: questionError,
  } = useQuery(GET_NEXT_QUESTION, {
    variables: {attemptId: attemptId},
    fetchPolicy: 'network-only',
    skip: !attemptId || showResults,
  })

  const {data: scoreData, refetch: refetchScore} = useQuery(GET_ATTEMPT_SCORE, {
    variables: {params: {attemptId: attemptId}},
    fetchPolicy: 'network-only',
    skip: !attemptId,
  })

  const [submitAnswer] = useMutation(SUBMIT_ANSWER)

  // ✅ Configure endAttempt mutation with cache eviction for latest attempt
  const [endAttempt] = useMutation(ATTEMPT_END, {
    update: (cache, {data}) => {
      if (data?.attemptEnd?.__typename === 'AttemptEndType') {
        console.log('🗑️ Evicting cache for assessment:', assessmentId)

        // ✅ Evict all possible queries that show attempt data
        try {
          // Evict latest attempt query
          cache.evict({
            id: 'ROOT_QUERY',
            fieldName: 'getLatestAttempt',
          })

          // Evict user attempts query
          cache.evict({
            id: 'ROOT_QUERY',
            fieldName: 'getUserAttempts',
          })

          // Evict assessment attempts query
          cache.evict({
            id: 'ROOT_QUERY',
            fieldName: 'getAssessmentAttempts',
          })

          // Evict any query that contains 'attempt'
          cache.evict({
            id: 'ROOT_QUERY',
            fieldName: 'getAttemptHistory',
          })

          // ✅ Clean up cache
          cache.gc()

          console.log(
            '✅ Cache evicted successfully - latest attempt will refetch',
          )
        } catch (err) {
          console.error('❌ Cache eviction error:', err)
        }
      }
    },
  })

  const {data: enrollmentData} = useQuery(GET_USER_ENROLLMENT, {
    variables: {userId},
    skip: !userId,
  })

  const userLearningPathId =
    enrollmentData?.getUserEnrollments?.enrollments?.find(
      (e) => e.courseId === courseId,
    )?.userLearningPathId

  const {data: learningUnitsData} = useQuery(GET_LEARNING_UNITS_BY_PATH, {
    variables: {userLearningPathId},
    skip: !userLearningPathId,
  })

  const currentLearningUnit =
    learningUnitsData?.getUserLearningUnits?.units?.find(
      (unit) => unit.topicId === topicId || unit.assessmentId === assessmentId,
    )

  const userLearningUnitId = currentLearningUnit?.userLearningUnitId

  const [updateProgress] = useMutation(UPDATE_LEARNING_UNIT_PROGRESS, {
    refetchQueries: [
      {
        query: GET_LEARNING_UNITS_BY_PATH,
        variables: {userLearningPathId},
      },
    ],
    awaitRefetchQueries: true,
  })

  // Calculate timer from startedAt
  useEffect(() => {
    if (scoreData?.getAttemptScore?.startedAt) {
      const startedAt = scoreData.getAttemptScore.startedAt
      const startTime = new Date(startedAt).getTime()
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - startTime) / 1000)
      const durationSeconds = EXAM_DURATION_MINUTES * 60
      const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds)

      console.group('⏰ TIMER CALCULATION')
      console.log('Start Time (raw):', startedAt)
      console.log('Start Time (parsed):', new Date(startTime))
      console.log('Current Time:', new Date(now))
      console.log('Duration:', EXAM_DURATION_MINUTES, 'minutes')
      console.log(
        'Elapsed:',
        Math.floor(elapsedSeconds / 60),
        'minutes',
        elapsedSeconds % 60,
        'seconds',
      )
      console.log(
        'Remaining:',
        Math.floor(remainingSeconds / 60),
        'minutes',
        remainingSeconds % 60,
        'seconds',
      )
      console.groupEnd()

      setTimeLeft(remainingSeconds)

      if (remainingSeconds <= 0 && !hasFinishedRef.current) {
        console.log('⏰ Time expired on load - auto-finishing quiz')
        handleFinishQuiz()
      }
    }
  }, [scoreData?.getAttemptScore?.startedAt])

  // Score update + flash animation
  useEffect(() => {
    if (scoreData?.getAttemptScore?.score !== undefined) {
      const newScore = scoreData.getAttemptScore.score
      if (newScore > totalScore) {
        const gained = newScore - totalScore
        setScoreFlash(`+${gained}`)
        setTimeout(() => setScoreFlash(null), 1500)
      }
      setTotalScore(newScore)
    }
  }, [scoreData?.getAttemptScore?.score])

  // Countdown timer
  // Countdown timer
  useEffect(() => {
    if (showResults || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1

        if (newTime <= 0 && !hasFinishedRef.current) {
          console.log('⏰ Timer reached 0 - auto-submitting and finishing quiz')
          autoSubmitAndFinish() // ⬅️ use helper
          return 0
        }

        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showResults, timeLeft])

  // Load question
  useEffect(() => {
    if (questionData?.getNextQuestion) {
      const q = questionData.getNextQuestion

      if (q.questionId && q.questionText) {
        setCurrentQuestion(q)
        setMcqSingle('')
        setMcqMulti([])
        setTextAnswer('')
        setTrueFalse('')
        setMatchPairs([])
        setAnswerFeedback(null)
        setIsSubmitting(false)
      } else if (q.__typename === 'AssessmentAttemptProgressType') {
        handleFinishQuiz(true)
      } else if (q.__typename === 'AttemptNotFoundType') {
        alert('Attempt not found!')
        navigate(-1)
      }
    }
  }, [questionData, navigate])

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const toggleMulti = (opt) => {
    setMcqMulti((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt],
    )
  }

  const formatResponse = (silent = false) => {
    // ✅ Add silent flag
    switch (questionType) {
      case 'MCQ_SINGLE':
        if (!mcqSingle) {
          if (!silent) alert('Please select an option')
          return null
        }
        return mcqSingle

      case 'MCQ_MULTI':
        if (mcqMulti.length === 0) {
          if (!silent) alert('Please select at least one option')
          return null
        }
        return mcqMulti

      case 'TRUE_FALSE':
        if (!trueFalse) {
          if (!silent) alert('Please select True or False')
          return null
        }
        return trueFalse

      case 'FILL_BLANK':
      case 'SHORT_ANSWER':
        if (!textAnswer.trim()) {
          if (!silent) alert('Please type your answer')
          return null
        }
        return textAnswer.trim()

      case 'MATCH_PAIRS':
        if (matchPairs.length === 0) {
          if (!silent) alert('Please match all pairs')
          return null
        }
        return matchPairs

      default:
        if (hasOptions && mcqSingle) return mcqSingle
        if (hasOptions && mcqMulti.length > 0) return mcqMulti
        if (textAnswer.trim()) return textAnswer.trim()

        if (!silent) alert('Please provide an answer')
        return null
    }
  }

  const getAnswerStatus = (answerStatus) => {
    if (!answerStatus) return 'WRONG'

    const status = String(answerStatus)
      .replace('AnswerStatus.', '')
      .toUpperCase()

    if (status === 'CORRECT') return 'CORRECT'
    if (status === 'PARTIALLY_CORRECT') return 'PARTIAL'
    return 'WRONG'
  }

  const handleAnswerSubmit = async () => {
    if (isSubmitting || answerFeedback) return

    // ✅ Use normal mode (false) for manual submit - alerts OK
    const response = formatResponse(false)
    if (response === null) return

    setIsSubmitting(true)

    const payload = {
      attemptId: attemptId,
      assessmentId: assessmentId,
      questionId: currentQuestion.questionId,
      response: response,
    }

    console.group('📤 SUBMITTING ANSWER')
    console.log('Question Type:', questionType)
    console.log('Raw Response:', response)
    console.log('Response Type:', typeof response)
    console.log('Is Array:', Array.isArray(response))
    console.log('Full Payload:', JSON.stringify(payload, null, 2))
    console.groupEnd()

    try {
      const result = await submitAnswer({
        variables: {params: payload},
      })

      const submitData = result?.data?.submitAnswer

      let status = 'WRONG'
      let pointsEarned = 0

      if (
        submitData?.isCorrect !== undefined &&
        submitData?.isCorrect !== null
      ) {
        status = getAnswerStatus(submitData.isCorrect)
        pointsEarned = submitData?.points ?? 0
      } else if (submitData?.totalPoints !== undefined) {
        const newTotal = submitData.totalPoints
        if (newTotal > totalScore) {
          status = 'CORRECT'
          pointsEarned = newTotal - totalScore
        }
      }

      setAnswerFeedback({
        status,
        points: pointsEarned,
      })

      setTimeout(async () => {
        await refetchScore()
        await refetchNextQuestion()
        setQuestionNumber((prev) => prev + 1)
      }, 2000)
    } catch (err) {
      console.group('❌ SUBMIT ERROR DETAILS')
      console.error('Error:', err)
      console.error('Error Message:', err.message)
      console.error('GraphQL Errors:', err.graphQLErrors)
      console.error('Network Error:', err.networkError)
      if (err.networkError?.result) {
        console.error('Backend Response:', err.networkError.result)
      }
      console.groupEnd()

      alert('Failed to submit: ' + err.message)
      setIsSubmitting(false)
    }
  }

  // ✅ Auto-submit current answer if any, then finish quiz
  // ✅ Auto-submit current answer if any, then finish quiz (mimics manual flow)
  const autoSubmitAndFinish = async () => {
    if (hasFinishedRef.current || showResults) return

    console.log('⏰ Auto-submit sequence started...')

    // Try to get a valid response from current state
    const response = formatResponse(true)
    if (response === null) {
      console.log('⏭️ No answer selected - skipping submit, finishing directly')
      await handleFinishQuiz()
      return
    }

    try {
      // 1️⃣ Submit current answer (same as manual submit)
      const payload = {
        attemptId,
        assessmentId,
        questionId: currentQuestion.questionId,
        response,
      }

      console.log('⏰ Auto-submitting last answer:', payload)

      const result = await submitAnswer({variables: {params: payload}})
      const submitData = result?.data?.submitAnswer

      // 2️⃣ Update score immediately (like manual flow does)
      if (scoreData?.getAttemptScore?.score !== undefined) {
        const newScore = scoreData.getAttemptScore.score
        if (newScore > totalScore) {
          const gained = newScore - totalScore
          setScoreFlash(`+${gained}`)
          setTimeout(() => setScoreFlash(null), 1500)
        }
        setTotalScore(newScore)
      }

      // 3️⃣ Refetch score and next question (like manual flow)
      await refetchScore()
      await refetchNextQuestion()

      // 4️⃣ Wait 2 seconds for feedback/score to settle (like manual flow)
      console.log('⏳ Waiting 2s for score update before finish...')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (err) {
      console.error('❌ Auto-submit error on timeout:', err)
      // Still try to finish even if submit failed
    }

    // 5️⃣ Now finish the quiz
    console.log('🏁 Auto-finish after submit complete')
    await handleFinishQuiz()
  }

  const handleFinishQuiz = async (skipProgressUpdate = false) => {
    if (showResults || isFinishing || hasFinishedRef.current) {
      console.log('⚠️ Quiz already finishing/finished, skipping...')
      return
    }

    hasFinishedRef.current = true
    setIsFinishing(true)

    try {
      console.log('🏁 Finishing quiz...')
      const result = await endAttempt({
        variables: {
          params: {attemptId: attemptId},
        },
      })

      const endData = result?.data?.attemptEnd
      console.log('✅ End attempt result:', endData)

      if (endData?.__typename === 'AttemptEndType') {
        if (!skipProgressUpdate && userLearningPathId && userLearningUnitId) {
          try {
            console.log('📝 Updating learning unit progress...')
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
            console.log('✅ Learning unit updated')
            await new Promise((resolve) => setTimeout(resolve, 1000))
          } catch (updateErr) {
            console.error('❌ Failed to update learning unit:', updateErr)
          }
        }

        setShowResults(true)
      } else if (endData?.__typename === 'AttemptNotFoundType') {
        alert('Attempt not found!')
      } else {
        setShowResults(true)
      }
    } catch (err) {
      console.error('❌ Finish quiz error:', err)
      hasFinishedRef.current = false
    } finally {
      setIsFinishing(false)
    }
  }

  // ✅ Handle page close/navigation
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      if (!showResults && !hasFinishedRef.current) {
        console.log('🚪 Page closing - finishing quiz immediately...')
        hasFinishedRef.current = true

        try {
          await endAttempt({
            variables: {
              params: {attemptId: attemptId},
            },
          })
          console.log('✅ Quiz finished on page close')
        } catch (err) {
          console.error('❌ Error finishing quiz on page close:', err)
        }
      }
    }

    const handlePopState = async (e) => {
      if (!showResults && !hasFinishedRef.current) {
        e.preventDefault()
        console.log('🔙 Back button - finishing quiz...')

        await handleFinishQuiz()

        setTimeout(() => {
          navigate(-1)
        }, 100)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [showResults, attemptId, endAttempt, navigate])

  // ✅ Cleanup on unmount
  useEffect(() => {
    if (!showResults) {
      localStorage.setItem('activeQuizAttempt', attemptId)
    } else {
      localStorage.removeItem('activeQuizAttempt')
    }

    return () => {
      const activeAttempt = localStorage.getItem('activeQuizAttempt')
      if (activeAttempt === attemptId && !hasFinishedRef.current) {
        console.log('🧹 Component unmounting - finishing quiz...')

        endAttempt({
          variables: {
            params: {attemptId: attemptId},
          },
        }).catch((err) => {
          console.error('❌ Error in cleanup:', err)
        })
      }
    }
  }, [showResults, attemptId, endAttempt])

  // ✅ Refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !showResults) {
        console.log('👁️ Tab became visible - refreshing data...')

        refetchScore()
        refetchNextQuestion()

        if (scoreData?.getAttemptScore?.startedAt) {
          const startedAt = scoreData.getAttemptScore.startedAt
          const startTime = new Date(startedAt).getTime()
          const now = Date.now()
          const elapsedSeconds = Math.floor((now - startTime) / 1000)
          const durationSeconds = EXAM_DURATION_MINUTES * 60
          const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds)

          setTimeLeft(remainingSeconds)

          if (remainingSeconds <= 0 && !hasFinishedRef.current) {
            console.log('⏰ Time expired while tab was hidden - finishing quiz')
            handleFinishQuiz()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [showResults, scoreData, refetchScore, refetchNextQuestion])

  // ✅ Poll for updates periodically
  useEffect(() => {
    if (showResults) return

    const pollInterval = setInterval(() => {
      console.log('🔄 Polling for updates...')
      refetchScore()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [showResults, refetchScore])

  // ✅ Enhanced back button handler with cache refresh
  const handleBackButton = async () => {
    console.log('🔙 Go Back button clicked - finishing quiz...')

    if (!showResults && !hasFinishedRef.current) {
      await handleFinishQuiz()

      // ✅ Wait for mutation to complete
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // ✅ Navigate to topic page if topicId exists, otherwise course page
    if (topicId) {
      window.location.href = `/course/${courseId}/topic/${topicId}`
    } else {
      window.location.href = `/course/${courseId}`
    }
  }

  // Loading screen
  if (!currentQuestion && !showResults) {
    return (
      <div className="min-h-screen bg-[#f9f3e4] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
          <div className="text-2xl font-bold text-gray-700 mb-6 text-center">
            Loading Quiz...
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Time Remaining:</p>
              <p className="text-xl font-bold text-red-600">
                {formatTime(timeLeft)}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Attempt Started:</p>
              <p className="text-sm font-mono">
                {scoreData?.getAttemptScore?.startedAt || '⏳ Loading...'}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Question Status:</p>
              <p className="text-sm">
                {questionLoading && '⏳ Loading question...'}
                {questionError && `❌ Error: ${questionError.message}`}
                {!questionLoading &&
                  !questionError &&
                  questionData &&
                  '✅ Question received'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => refetchNextQuestion()}
              className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              🔄 Retry
            </button>

            <button
              onClick={handleBackButton}
              className="flex-1 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Results screen
  if (showResults) {
    return (
      <div className="min-h-screen bg-[#f9f3e4] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl border border-[#efe7db]">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-6">
            Quiz Completed!
          </h1>
          <div className="text-6xl font-bold text-[#f07d57] mb-8">
            {totalScore} points
          </div>
          <button
            onClick={() => {
              // ✅ Navigate to topic page if topicId exists, otherwise course page
              if (topicId) {
                window.location.href = `/course/${courseId}/topic/${topicId}`
              } else {
                window.location.href = `/course/${courseId}`
              }
            }}
            className="px-12 py-4 bg-gradient-to-r from-[#f07d57] to-[#ff9a76] text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            Back to {topicId ? 'Topic' : 'Course'}
          </button>
        </div>
      </div>
    )
  }

  // Quiz interface
  return (
    <div className="min-h-screen bg-[#f9f3e4] py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 flex justify-between items-center border border-[#efe7db]">
          <AppTitle />
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${
                  timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-red-600'
                }`}
              >
                {formatTime(timeLeft)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Time Left</p>
            </div>
            <div className="relative">
              <div className="bg-orange-100 px-8 py-4 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-bold text-[#f07d57] relative">
                  {totalScore}
                  {scoreFlash && (
                    <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-3xl font-bold text-green-600 animate-bounce">
                      {scoreFlash}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1">Points</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-[#efe7db]">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500 font-medium bg-gray-100 px-4 py-2 rounded-full">
              Question {questionNumber}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-full">
                {questionType?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
            {currentQuestion.questionText}
          </h2>

          {/* Answer Feedback */}
          {answerFeedback && (
            <div
              className={`mb-6 p-6 rounded-2xl border-2 ${
                answerFeedback.status === 'CORRECT'
                  ? 'bg-green-50 border-green-500'
                  : answerFeedback.status === 'PARTIAL'
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-red-50 border-red-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-4xl">
                  {answerFeedback.status === 'CORRECT'
                    ? '✅'
                    : answerFeedback.status === 'PARTIAL'
                    ? '🟠'
                    : '❌'}
                </div>
                <div>
                  <p
                    className={`text-xl font-bold ${
                      answerFeedback.status === 'CORRECT'
                        ? 'text-green-700'
                        : answerFeedback.status === 'PARTIAL'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}
                  >
                    {answerFeedback.status === 'CORRECT'
                      ? 'Correct!'
                      : answerFeedback.status === 'PARTIAL'
                      ? 'Partially Correct'
                      : 'Incorrect'}
                  </p>
                  <p className="text-gray-600">
                    {answerFeedback.points > 0
                      ? `+${answerFeedback.points} points!`
                      : `${answerFeedback.points} points`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TRUE/FALSE */}
          {questionType === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {['True', 'False'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTrueFalse(opt)}
                  disabled={answerFeedback !== null}
                  className={`p-6 rounded-2xl text-2xl font-bold border-4 transition-all shadow-md
                    ${
                      trueFalse === opt
                        ? 'border-[#f07d57] bg-orange-50 text-[#f07d57]'
                        : 'border-gray-300 hover:border-gray-500 bg-white'
                    }
                    ${
                      answerFeedback !== null
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* MCQ MULTI */}
          {questionType === 'MCQ_MULTI' && hasOptions && (
            <div className="space-y-4 mb-8">
              {currentQuestion.options.map((opt, i) => (
                <label
                  key={i}
                  className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer text-lg font-medium transition-all shadow-md
                  ${
                    mcqMulti.includes(opt)
                      ? 'border-[#f07d57] bg-orange-50 text-[#f07d57]'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }
                  ${
                    answerFeedback !== null
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={mcqMulti.includes(opt)}
                    onChange={() => toggleMulti(opt)}
                    disabled={answerFeedback !== null}
                    className="w-5 h-5 text-[#f07d57] rounded mr-4"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* MCQ SINGLE */}
          {questionType === 'MCQ_SINGLE' && hasOptions && (
            <div className="space-y-4 mb-8">
              {currentQuestion.options.map((opt, i) => (
                <label
                  key={i}
                  className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer text-lg font-medium transition-all shadow-md
                  ${
                    mcqSingle === opt
                      ? 'border-[#f07d57] bg-orange-50 text-[#f07d57]'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }
                  ${
                    answerFeedback !== null
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="mcq"
                    checked={mcqSingle === opt}
                    onChange={() => setMcqSingle(opt)}
                    disabled={answerFeedback !== null}
                    className="w-5 h-5 text-[#f07d57] mr-4"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* TEXT INPUT */}
          {(questionType === 'FILL_BLANK' ||
            questionType === 'SHORT_ANSWER' ||
            (!hasOptions &&
              questionType !== 'MATCH_PAIRS' &&
              questionType !== 'TRUE_FALSE')) && (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={answerFeedback !== null}
              placeholder="Type your answer here..."
              className="w-full p-6 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#f07d57] focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none transition-all"
              rows={6}
            />
          )}

          {/* Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-[#efe7db]">
            <button
              onClick={handleAnswerSubmit}
              disabled={isSubmitting || answerFeedback !== null}
              className="px-12 py-4 bg-gradient-to-r from-[#f07d57] to-[#ff9a76] text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting
                ? '⏳ Submitting...'
                : answerFeedback
                ? '✓ Submitted'
                : '🚀 Submit Answer'}
            </button>

            <button
              onClick={handleFinishQuiz}
              disabled={isFinishing}
              className="px-10 py-4 bg-gray-700 hover:bg-gray-800 text-white text-lg font-bold rounded-2xl shadow-lg transition-all disabled:opacity-50"
            >
              {isFinishing ? '⏳ Finishing...' : 'Finish Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
