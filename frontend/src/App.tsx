import { Navigate, Route, Routes } from 'react-router'
import BoardPage from './features/board/BoardPage'
import styles from './App.module.css'

function App() {
  return (
    <div className={styles.app}>
      <h1 className={styles.logo}>TaskBoard</h1>
      <Routes>
        <Route path="/projects/:projectId/board" element={<BoardPage />} />
        {/* プロジェクト一覧はまだないので、当面は最初のプロジェクトのボードを開く */}
        <Route path="*" element={<Navigate to="/projects/1/board" replace />} />
      </Routes>
    </div>
  )
}

export default App
