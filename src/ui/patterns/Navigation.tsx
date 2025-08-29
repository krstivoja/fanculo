import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import navItems from '../../consts/pagesURL'

interface NavigationProps {
  onQuickCreate?: (type: string) => void;
}

function Navigation({ onQuickCreate }: NavigationProps) {
  const location = useLocation()
  const [showQuickCreateDropdown, setShowQuickCreateDropdown] = useState(false)

  const handleQuickCreate = (type: string) => {
    setShowQuickCreateDropdown(false)
    if (onQuickCreate) {
      onQuickCreate(type)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-5 flex items-center gap-8 min-h-[60px] w-full">
      <div className='flex mr-auto'>
      {/* Logo/Title */}
      <div className="flex items-center gap-3 mr-5">
        <div className="text-2xl">🚀</div>
        <h1 className="m-0 text-xl font-semibold text-gray-800">
          Fanculo
        </h1>
      </div>

      {/* Quick Create Dropdown - Only show on Editor page */}
      {location.pathname === '/editor' && (
        <div className="relative ml-auto">
          <button
            onClick={() => setShowQuickCreateDropdown(!showQuickCreateDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-wp-blue text-white rounded-md text-sm font-medium hover:bg-wp-blue-dark transition-colors"
          >
            <span>✨</span>
            Quick Create
            <span className={`transition-transform ${showQuickCreateDropdown ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showQuickCreateDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                <button
                  onClick={() => handleQuickCreate('blocks')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>🧱</span> Block
                </button>
                <button
                  onClick={() => handleQuickCreate('symbols')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>🔣</span> Symbol
                </button>
                <button
                  onClick={() => handleQuickCreate('scss')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>🎨</span> SCSS
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      </div>

      {/* Navigation Links */}
      <nav className="flex gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium
                no-underline transition-all duration-200 relative
                ${isActive 
                  ? 'text-wp-blue bg-blue-50 border border-wp-blue font-semibold' 
                  : 'text-gray-600 border border-transparent hover:bg-gray-100 hover:text-gray-800'
                }
              `}
              title={item.description}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {isActive && (
                <div className="absolute -bottom-px left-1/2 transform -translate-x-1/2 w-1 h-1 bg-wp-blue rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      
    </div>
  )
}

export default Navigation