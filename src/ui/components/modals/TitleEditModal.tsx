import { useState, useEffect } from 'react'
import { Button, TextControl, Modal } from '@wordpress/components'
import { MdOutlineDescription } from 'react-icons/md'

interface TitleEditModalProps {
	isOpen: boolean
	currentTitle: string
	onClose: () => void
	onSave: (title: string) => void
}

export default function TitleEditModal({
	isOpen,
	currentTitle,
	onClose,
	onSave
}: TitleEditModalProps) {
	const [title, setTitle] = useState('')

	useEffect(() => {
		if (isOpen) {
			setTitle(currentTitle)
		}
	}, [isOpen, currentTitle])

	const handleSave = () => {
		if (title.trim()) {
			onSave(title)
			handleClose()
		}
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
					<MdOutlineDescription size={20} />
					Edit Post Title
				</span>
			}
			onRequestClose={handleClose}
			className="fanculo-title-edit-modal"
		>
			<p className="text-gray-600 text-sm mb-4">
				Update the title for this post.
			</p>

			<TextControl
				label="Title:"
				type="text"
				value={title}
				onChange={(value) => setTitle(value)}
				placeholder="Enter post title..."
				autoFocus
				onKeyPress={(e) => {
					if (e.key === 'Enter') {
						handleSave()
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
				>
					Cancel
				</Button>
				<Button
					variant="primary"
					onClick={handleSave}
					disabled={!title.trim()}
				>
					Save
				</Button>
			</div>
		</Modal>
	)
}