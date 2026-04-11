import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './components/views/Home'
import { Library } from './components/views/Library'
import { Settings } from './components/views/Settings'
import { ContinueListening } from './components/views/ContinueListening'
import { Favorites } from './components/views/Favorites'
import { Playlists } from './components/views/Playlists'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="continue" element={<ContinueListening />} />
          <Route path="library" element={<Library />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
