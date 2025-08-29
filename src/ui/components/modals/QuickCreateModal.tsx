import { useState } from 'react'
import { Button, TextControl, Modal } from '@wordpress/components'
import { BlocksIcon, SymbolIcon, StyleIcon } from '../../icons/Icons.jsx'

interface QuickCreateModalProps {
	isOpen: boolean
	type: string
	onClose: () => void
	onSubmit: (title: string) => Promise<void>
	isCreating: boolean
}

export default function QuickCreateModal({
	isOpen,
	type,
	onClose,
	onSubmit,
	isCreating
}: QuickCreateModalProps) {
	const [title, setTitle] = useState('')

	const handleSubmit = async () => {
		if (!title.trim()) return
		await onSubmit(title)
		setTitle('')
	}

	const handleClose = () => {
		setTitle('')
		onClose()
	}

	if (!isOpen) return null

	return (
		<Modal
			title={
				<span className="flex items-center gap-2">
					{type === 'blocks' && <BlocksIcon width={20} height={20} />}
					{type === 'symbols' && <SymbolIcon width={20} height={20} />}
					{type === 'scss' && <StyleIcon width={20} height={20} />}
					{type === 'blocks' && 'Create New Block'}
					{type === 'symbols' && 'Create New Symbol'}
					{type === 'scss' && 'Create New SCSS'}
				</span>
			}
			onRequestClose={handleClose}
			className="fanculo-quick-create-modal"
		>
			<p className="text-gray-600 text-sm mb-4">
				Enter a title for your new {type.slice(0, -1)}. You can add content and styles later.
			</p>

			<TextControl
				label="Title:"
				type="text"
				value={title}
				onChange={(value) => setTitle(value)}
				placeholder={`Enter ${type.slice(0, -1)} title...`}
				autoFocus
				onKeyPress={(e) => {
					if (e.key === 'Enter') {
						handleSubmit()
					}
					if (e.key === 'Escape') {
						handleClose()
					}
				}}
			/>

			<div className="flex gap-2.5 justify-end mt-4">
				<Button
					variant="tertiary"
					onClick={handleClose}
					disabled={isCreating}
				>
					Cancel
				</Button>
				<Button
					variant="primary"
					onClick={handleSubmit}
					isBusy={isCreating}
					disabled={isCreating || !title.trim()}
				>
					{isCreating ? 'Creating...' : 'Create'}
				</Button>
			</div>
		</Modal>
	)
}