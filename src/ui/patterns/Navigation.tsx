import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { MenuGroup, MenuItem, Button, Popover } from '@wordpress/components'
import { BlocksIcon, SymbolIcon, StyleIcon, MoreIcon, LogoIcon } from '../icons/Icons.jsx'
import { Icon, moreVertical, plus } from '@wordpress/icons';
import navItems from '../../consts/pagesURL'

interface NavigationProps {
  onQuickCreate?: (type: string) => void;
  onUpdatePost?: () => void;
  isUpdating?: boolean;
  showUpdateButton?: boolean;
}

function Navigation({ onQuickCreate, onUpdatePost, isUpdating, showUpdateButton }: NavigationProps) {
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
    <header className="px-4 py-2 flex items-center gap-2 w-full bg-white border-b border-ui-outline">
      <div className='flex mr-auto'>
        {/* Quick Create Dropdown - Only show on Editor page */}
        {location.pathname === '/editor' && (
          <div className="relative ml-auto">
            <Button
              onClick={() => setShowQuickCreateDropdown(!showQuickCreateDropdown)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Icon icon={plus} size={16} />
              Quick Create
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

      {/* Update Post Button - Only show when editing */}
      {showUpdateButton && (
        <Button
          onClick={onUpdatePost}
          variant="primary"
          disabled={isUpdating}
          className="flex items-center gap-2"
        >
          {isUpdating ? 'Updating...' : 'Update Post'}
        </Button>
      )}

      {/* Navigation Menu */}
      <div className="relative">
        <Button
          onClick={() => setShowMainMenu(!showMainMenu)}
          variant="secondary"
          className="flex items-center gap-2"
          icon={moreVertical} label="Pages"
        >
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
                    icon={<item.icon width={24} height={24} />}
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
    </header>
  )
}

export default Navigation