import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { MenuGroup, MenuItem, Button, Popover } from '@wordpress/components'
import { BlocksIcon, SymbolIcon, StyleIcon } from '../icons/Icons.jsx'
import { MdOutlineRocketLaunch, MdOutlineViewList, MdOutlineAdd } from 'react-icons/md'
import navItems from '../../consts/pagesURL'

interface NavigationProps {
  onQuickCreate?: (type: string) => void;
}

function Navigation({ onQuickCreate }: NavigationProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [showQuickCreateDropdown, setShowQuickCreateDropdown] = useState(false)
  const [showMainMenu, setShowMainMenu] = useState(false)

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
        <MdOutlineRocketLaunch size={28} className="text-blue-600" />
        <h1 className="m-0 text-xl font-semibold text-gray-800">
          Fanculo
        </h1>
      </div>

      {/* Quick Create Dropdown - Only show on Editor page */}
      {location.pathname === '/editor' && (
        <div className="relative ml-auto">
          <Button
            onClick={() => setShowQuickCreateDropdown(!showQuickCreateDropdown)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <MdOutlineAdd size={16} />
            Quick Create
            <span className={`transition-transform ${showQuickCreateDropdown ? 'rotate-180' : ''}`}>▼</span>
          </Button>

          {showQuickCreateDropdown && (
            <Popover
              position="bottom right"
              onClose={() => setShowQuickCreateDropdown(false)}
              className="fanculo-quick-create-popover"
            >
              <MenuGroup label="Create New">
                <MenuItem
                  onClick={() => handleQuickCreate('blocks')}
                  icon={<BlocksIcon width={16} height={16} />}
                  info="Create a new reusable block component"
                >
                  Block
                </MenuItem>
                <MenuItem
                  onClick={() => handleQuickCreate('symbols')}
                  icon={<SymbolIcon width={16} height={16} />}
                  info="Create a new symbol component"
                >
                  Symbol
                </MenuItem>
                <MenuItem
                  onClick={() => handleQuickCreate('scss')}
                  icon={<StyleIcon width={16} height={16} />}
                  info="Create a new SCSS partial"
                >
                  SCSS
                </MenuItem>
              </MenuGroup>
            </Popover>
          )}
        </div>
      )}

      </div>

      {/* Navigation Menu */}
      <div className="relative">
        <Button
          onClick={() => setShowMainMenu(!showMainMenu)}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <MdOutlineViewList size={16} />
          Pages
          <span className={`transition-transform ${showMainMenu ? 'rotate-180' : ''}`}>▼</span>
        </Button>

        {showMainMenu && (
          <Popover
            position="bottom right"
            onClose={() => setShowMainMenu(false)}
            className="fanculo-main-menu-popover"
          >
            <MenuGroup label="Navigation">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                
                return (
                  <MenuItem
                    key={item.path}
                    onClick={() => {
                      setShowMainMenu(false)
                      navigate(item.path)
                    }}
                    icon={<item.icon width={16} height={16} />}
                    isSelected={isActive}
                    info={item.description}
                  >
                    {item.label}
                  </MenuItem>
                )
              })}
            </MenuGroup>
          </Popover>
        )}
      </div>

      
    </div>
  )
}

export default Navigation