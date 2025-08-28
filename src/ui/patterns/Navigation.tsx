import { Link, useLocation } from 'react-router-dom'
import navItems from '../../consts/pagesURL'

function Navigation() {
  const location = useLocation()
  

  return (
    <div className="bg-white border-b border-gray-200 px-5 flex items-center gap-8 min-h-[60px] w-full">
      {/* Logo/Title */}
      <div className="flex items-center gap-3 mr-5 mr-auto">
        <div className="text-2xl">🚀</div>
        <h1 className="m-0 text-xl font-semibold text-gray-800">
          Fanculo
        </h1>
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