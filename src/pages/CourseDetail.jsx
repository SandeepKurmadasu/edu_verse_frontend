// src/pages/CourseDetail.jsx  ← FIXED: Arrow symbols for expand/collapse

import React, {useState, useMemo} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
import {useQuery, useMutation} from '@apollo/client'

import {GET_COURSE, GET_MODULES, GET_TOPICS_FOR_COURSE} from '../graphql/course'
import {ENROLL_COURSE, GET_USER_ENROLLMENT} from '../graphql/enrollment'
import {GET_LEARNING_UNITS_BY_PATH} from '../graphql/learning'
import AppTitle from '../components/AppTitle'

/* --------------------------------------------------
   MODULE ROW - ARROW SYMBOLS
-------------------------------------------------- */
function ModuleRow({module, topics, courseId, topicStatusMap, displayOrder}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          {/* ✅ SEQUENTIAL 1,2,3... ORDER */}
          <div className="w-10 h-10 rounded-lg bg-[#fff4ee] flex items-center justify-center text-[#f07d57] font-bold text-lg">
            {displayOrder}
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-gray-800">
              {module.moduleTitle}
            </h4>
            <p className="text-sm text-gray-500">{module.description}</p>
          </div>
        </div>
        {/* ✅ ARROW SYMBOLS: ▼ when open, ▶ when closed */}
        <span className="text-xl text-gray-400">{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/30">
          <div className="p-4">
            {topics.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No topics yet.</p>
            ) : (
              <ul className="space-y-3">
                {topics.map((topic) => {
                  const unit = topicStatusMap[topic.topicId] || {}
                  const status = unit.status || 'LOCKED'
                  const percentage = unit.percentage || 0
                  const isLocked = unit.isLocked ?? true

                  const isCompleted = status === 'COMPLETE'
                  const isHalfCompleted = status === 'HALF_COMPLETED'
                  const isStarted = status === 'START'

                  return (
                    <li
                      key={topic.topicId}
                      className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100 hover:border-orange-200 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h5 className="font-medium text-gray-800">
                            {topic.topicTitle}
                          </h5>

                          {isCompleted && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              ✓ Completed
                            </span>
                          )}

                          {isHalfCompleted && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              {percentage}% In Progress
                            </span>
                          )}

                          {isLocked && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded flex items-center gap-1">
                              🔒 Locked
                            </span>
                          )}
                        </div>

                        {topic.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {topic.description}
                          </p>
                        )}

                        <div className="text-xs text-gray-400 mt-1">
                          {topic.topicType} •{' '}
                          {topic.estimatedDurationInMins || 0} mins
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          navigate(`/course/${courseId}/topic/${topic.topicId}`)
                        }
                        disabled={isLocked}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                          isLocked
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : isCompleted
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : isHalfCompleted || isStarted
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-[#f07d57] hover:bg-[#e46f4a] text-white'
                        }`}
                      >
                        {isLocked
                          ? 'Locked'
                          : isCompleted
                          ? 'Review'
                          : isHalfCompleted || isStarted
                          ? 'Continue'
                          : 'Start'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------- */
export default function CourseDetail() {
  const {courseId} = useParams()
  const navigate = useNavigate()

  const [enrollCourse] = useMutation(ENROLL_COURSE)
  const stored = localStorage.getItem('user')
  const userId = stored ? JSON.parse(stored).userId : null

  const handleEnroll = async () => {
    if (!userId) {
      alert('Please login first!')
      navigate('/login')
      return
    }
    try {
      await enrollCourse({variables: {userId, courseId}})
      alert('Enrolled successfully!')
      window.location.reload()
    } catch (err) {
      alert('Failed: ' + err.message)
    }
  }

  const {data: courseData} = useQuery(GET_COURSE, {
    variables: {courseIds: [courseId]},
    skip: !courseId,
  })
  const {data: modulesData} = useQuery(GET_MODULES, {
    variables: {courseIds: [courseId]},
    skip: !courseId,
  })
  const {data: topicsData} = useQuery(GET_TOPICS_FOR_COURSE, {
    variables: {courseId},
    skip: !courseId,
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

  const course = courseData?.getCourses?.courses?.[0] || null
  const allModules = modulesData?.getModules?.modules || []
  const allTopics = topicsData?.getTopicsForCourse?.topics || []
  const isEnrolled = !!userLearningPathId

  // Get unique module IDs from learning units
  const enrolledModuleIds = useMemo(() => {
    if (!learningUnitsData?.getUserLearningUnits?.units) return new Set()

    const moduleIds = new Set()
    learningUnitsData.getUserLearningUnits.units.forEach((unit) => {
      if (unit.moduleId) {
        moduleIds.add(unit.moduleId)
      }
    })
    return moduleIds
  }, [learningUnitsData])

  // Filter modules to only show enrolled ones
  const enrolledModules = useMemo(() => {
    if (!isEnrolled) return allModules

    return allModules.filter((module) => enrolledModuleIds.has(module.moduleId))
  }, [allModules, enrolledModuleIds, isEnrolled])

  const topicStatusMap = useMemo(() => {
    if (!isEnrolled || !learningUnitsData?.getUserLearningUnits?.units)
      return {}
    const map = {}
    learningUnitsData.getUserLearningUnits.units.forEach((u) => {
      map[u.topicId] = u
    })
    return map
  }, [isEnrolled, learningUnitsData])

  const totalCourseDuration = useMemo(() => {
    if (!isEnrolled || !topicStatusMap || allTopics.length === 0) return 0

    // Sum durations from enrolled topics only
    const enrolledTopics = allTopics.filter(
      (topic) => topicStatusMap[topic.topicId],
    )
    const totalMins = enrolledTopics.reduce((sum, topic) => {
      console.log(
        `Topic ${topic.topicTitle}: ${topic.estimatedDurationInMins || 0} mins`,
      ) // TEMP DEBUG
      return sum + (topic.estimatedDurationInMins || 0)
    }, 0)

    console.log(
      `Total course duration: ${totalMins} mins from ${enrolledTopics.length} topics`,
    ) // TEMP DEBUG
    return totalMins
  }, [isEnrolled, topicStatusMap, allTopics])

  const enrolledTopicIds = useMemo(() => {
    return new Set(Object.keys(topicStatusMap))
  }, [topicStatusMap])

  const topicsByModule = useMemo(() => {
    const map = {}
    allTopics.forEach((t) => {
      if (!isEnrolled || enrolledTopicIds.has(t.topicId)) {
        const key = t.moduleId || 'none'
        if (!map[key]) map[key] = []
        map[key].push(t)
      }
    })
    return map
  }, [allTopics, enrolledTopicIds, isEnrolled])

  const completionStats = useMemo(() => {
    const units = Object.values(topicStatusMap)
    const completed = units.filter((u) => u.status === 'COMPLETE').length
    const halfCompleted = units.filter(
      (u) => u.status === 'HALF_COMPLETED',
    ).length
    const started = units.filter((u) => u.status === 'START').length
    const total = enrolledTopicIds.size

    const totalPercentage = units.reduce((sum, unit) => {
      if (unit.status === 'COMPLETE') return sum + 100
      if (unit.status === 'HALF_COMPLETED') return sum + 50
      if (unit.status === 'START') return sum + 10
      return sum
    }, 0)

    const percentage = total > 0 ? Math.round(totalPercentage / total) : 0

    return {completed, halfCompleted, started, total, percentage}
  }, [topicStatusMap, enrolledTopicIds])

  if (!course)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f3e4] text-gray-600">
        Loading...
      </div>
    )

  return (
    <div className="min-h-screen bg-[#f9f3e4]">
      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <AppTitle />
          {!isEnrolled ? (
            <button
              onClick={handleEnroll}
              className="px-6 py-3 bg-[#f07d57] text-white rounded-xl font-medium hover:bg-[#e46f4a] shadow"
            >
              Enroll Now
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="text-[#f07d57] hover:underline"
            >
              ← Back
            </button>
          )}
        </div>

        {/* Course Info */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {course.title}
          </h1>
          <p className="text-gray-600 mb-4">{course.description}</p>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span>Duration: {totalCourseDuration || '—'} mins</span>
            <span>
              Progress:{' '}
              <strong className="text-[#f07d57]">
                {completionStats.percentage}%
              </strong>
            </span>
            <span>✓ {completionStats.completed} completed</span>
            {completionStats.halfCompleted > 0 && (
              <span>⏳ {completionStats.halfCompleted} in progress</span>
            )}
            {completionStats.started > 0 && (
              <span>▶ {completionStats.started} started</span>
            )}
          </div>

          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 bg-[#f07d57] rounded-full transition-all"
              style={{width: `${completionStats.percentage}%`}}
            />
          </div>
        </div>

        {/* Modules */}
        <h2 className="text-xl font-bold text-gray-800 mb-5">
          {isEnrolled ? 'Your Learning Path' : 'Course Content'}
        </h2>

        {enrolledModules.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            {isEnrolled
              ? 'No modules in your learning path yet.'
              : 'No modules available. Please enroll to see course content.'}
          </div>
        ) : (
          // ✅ SEQUENTIAL 1-N ORDERING with arrow symbols
          [...enrolledModules]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((module, index) => (
              <ModuleRow
                key={module.moduleId}
                module={module}
                topics={topicsByModule[module.moduleId] || []}
                courseId={courseId}
                topicStatusMap={topicStatusMap}
                displayOrder={index + 1}
              />
            ))
        )}
      </div>
    </div>
  )
}
