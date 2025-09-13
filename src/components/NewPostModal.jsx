import React, { useState, useEffect, useRef } from 'react'

const NewPostModal = ({ isOpen, onClose, postType, onPostCreated }) => {
  const [title, setTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const titleInputRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      setTitle('')
      setError('')
      dialog.showModal()
      // Focus the input after dialog opens
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    } else {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      onClose()
    }

    const handleCancel = (e) => {
      e.preventDefault()
      onClose()
    }

    dialog.addEventListener('close', handleClose)
    dialog.addEventListener('cancel', handleCancel)

    return () => {
      dialog.removeEventListener('close', handleClose)
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/wp-json/funculo/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
        body: JSON.stringify({
          title: title.trim(),
          taxonomy_term: postType.slug,
          status: 'draft'
        }),
      })

      if (response.ok) {
        const newPost = await response.json()
        onPostCreated(newPost)
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      setError('An error occurred while creating the post')
    } finally {
      setIsCreating(false)
    }
  }

  if (!postType) return null

  return (
    <dialog ref={dialogRef} className="new-post-dialog">
      <div className="modal-header">
        <div className="modal-title-wrapper">
          <span
            className="modal-type-icon"
            style={{ '--type-color': postType.color }}
          >
            {postType.icon}
          </span>
          <h3 className="modal-title">Create New {postType.name}</h3>
        </div>
        <button
          className="modal-close"
          onClick={onClose}
          disabled={isCreating}
          type="button"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label htmlFor="post-title" className="form-label">
            Title
          </label>
          <input
            ref={titleInputRef}
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Enter ${postType.name.toLowerCase()} name...`}
            className={`form-input ${error ? 'error' : ''}`}
            disabled={isCreating}
          />
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="modal-btn modal-btn-secondary"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="modal-btn modal-btn-primary"
            disabled={isCreating || !title.trim()}
            style={{ '--type-color': postType.color }}
          >
            {isCreating ? (
              <>
                <span className="btn-spinner"></span>
                Creating...
              </>
            ) : (
              `Create ${postType.name}`
            )}
          </button>
        </div>
      </form>

      <div className="modal-info">
        <p>
          The {postType.name.toLowerCase()} will be created as a draft.
          You can edit it and add content after creation.
        </p>
      </div>
    </dialog>
  )
}

export default NewPostModal