import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import CourseDetail from './pages/CourseDetail'
import CreateUser from './pages/CreateUser'
import TopicDetail from './pages/TopicDetail'
import Profile from './pages/Profile' // Add this import
import QuizAttempt from './pages/QuizAttempt'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<CreateUser />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/course/:courseId" element={<CourseDetail />} />
        <Route
          path="/course/:courseId/topic/:topicId"
          element={<TopicDetail />}
        />
        <Route
          path="/assessment/:assessmentId/attempt/:attemptId"
          element={<QuizAttempt />}
        />
      </Routes>
    </BrowserRouter>
  )
}
