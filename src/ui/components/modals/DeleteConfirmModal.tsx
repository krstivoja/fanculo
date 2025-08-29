import { Button, Modal } from '@wordpress/components'

interface DeleteConfirmModalProps {
	isOpen: boolean
	postTitle: string
	onClose: () => void
	onConfirm: () => Promise<void>
	isDeleting: boolean
}

export default function DeleteConfirmModal({
	isOpen,
	postTitle,
	onClose,
	onConfirm,
	isDeleting
}: DeleteConfirmModalProps) {
	if (!isOpen) return null

	return (
		<Modal
			title="🗑️ Delete Post"
			onRequestClose={onClose}
			className="fanculo-delete-confirm-modal"
			isDismissible={!isDeleting}
		>
			<p className="text-gray-600 text-sm mb-4">
				Are you sure you want to delete "<strong>{postTitle}</strong>"? This action cannot be undone.
			</p>

			<div className="flex gap-2.5 justify-end mt-4">
				<Button
					variant="tertiary"
					onClick={onClose}
					disabled={isDeleting}
				>
					Cancel
				</Button>
				<Button
					variant="secondary"
					isDestructive={true}
					onClick={onConfirm}
					isBusy={isDeleting}
					disabled={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</Button>
			</div>
		</Modal>
	)
}