import { useState, useEffect } from 'react'
import { Modal, SearchControl } from '@wordpress/components'
import { dashicons } from '../../../consts/dashicons.js'

interface DashiconSelectorProps {
  isOpen: boolean
  onClose: () => void
  selectedIcon: string
  onSelect: (icon: string) => void
}

function DashiconSelector({ isOpen, onClose, selectedIcon, onSelect }: DashiconSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredIcons, setFilteredIcons] = useState(dashicons)

  useEffect(() => {
    if (searchTerm) {
      const filtered = dashicons.filter(icon => 
        icon.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredIcons(filtered)
    } else {
      setFilteredIcons(dashicons)
    }
  }, [searchTerm])

  if (!isOpen) return null

  return (
    <Modal
      title="Select Dashicon"
      onRequestClose={onClose}
      className="fanculo-dashicon-selector-modal"
    >
      <div className="p-4">
        <SearchControl
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search icons..."
        />
        <div className="mt-4 grid grid-cols-6 gap-2 max-h-[400px] overflow-y-auto">
          {filteredIcons.map((icon) => (
            <button
              key={icon}
              className={`p-4 text-center rounded hover:bg-gray-100 transition-colors ${
                selectedIcon === icon ? 'bg-blue-100 border-2 border-blue-500' : 'border-2 border-transparent'
              }`}
              onClick={() => {
                onSelect(icon)
                onClose()
              }}
            >
              <span className={`dashicons dashicons-${icon} text-xl`}></span>
              <div className="text-xs mt-1 truncate">{icon}</div>
            </button>
          ))}
        </div>
        {filteredIcons.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No icons found matching "{searchTerm}"
          </div>
        )}
      </div>
    </Modal>
  )
}

export default DashiconSelector