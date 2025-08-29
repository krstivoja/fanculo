import { useState, useEffect, Suspense, forwardRef, useImperativeHandle } from 'react'
import LoadingSpinner from '../ui/components/LoadingSpinner'
import PostListSidebar from '../ui/components/PostListSidebar'
import MonacoEditor from '../ui/components/MonacoEditor'
import { Button, TextControl, TextareaControl, TabPanel, Modal } from '@wordpress/components'
import { BlocksIcon, SymbolIcon, StyleIcon, SettingsIcon } from '../ui/icons/Icons.jsx'
import { MdOutlineDescription } from 'react-icons/md'
import { preloadCommonLanguages } from '../utils/monacoLanguageLoader'

declare global {
	interface Window {
		fanculo_ajax: {
			ajax_url: string;
			nonce: string;
			plugin_url: string;
			types: string[];
			type_labels: Record<string, string>;
			type_icons: Record<string, string>;
			user_can: {
				manage_options: boolean;
				edit_posts: boolean;
				delete_posts: boolean;
			};
		};
	}
}

interface EditorPageRef {
	handleQuickCreate: (type: string) => void;
}

const EditorPage = forwardRef<EditorPageRef>((props, ref) => {
	const [message, setMessage] = useState('')

	// Post creation/editing state
	const [editingPostId, setEditingPostId] = useState<number | null>(null)
	const [postTitle, setPostTitle] = useState('')
	const [postType, setPostType] = useState('blocks')
	const [postContent, setPostContent] = useState('')
	const [postStyle, setPostStyle] = useState('')
	const [postAttributes, setPostAttributes] = useState('')
	const [isCreating, setIsCreating] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)
	const [isLoadingPost, setIsLoadingPost] = useState(false)

	// Posts list state
	const [posts, setPosts] = useState({
		blocks: [],
		symbols: [],
		scss: []
	})
	const [isLoadingPosts, setIsLoadingPosts] = useState(false)
	const [activeTab, setActiveTab] = useState('blocks')

	// Quick create modal state
	const [showModal, setShowModal] = useState(false)
	const [quickCreateType, setQuickCreateType] = useState('')
	const [quickTitle, setQuickTitle] = useState('')
	const [isQuickCreating, setIsQuickCreating] = useState(false)

	// Delete confirmation state
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	// Title editing modal state
	const [showTitleModal, setShowTitleModal] = useState(false)
	const [tempTitle, setTempTitle] = useState('')

	const fetchPosts = async () => {
		setIsLoadingPosts(true)
		try {
			const response = await fetch(window.fanculo_ajax.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'fanculo_get_posts',
					nonce: window.fanculo_ajax.nonce,
				}),
			})

			const result = await response.json()
			if (result.success) {
				setPosts(result.data)
			}
		} catch (error) {
			console.error('Error fetching posts:', error)
		} finally {
			setIsLoadingPosts(false)
		}
	}

	useEffect(() => {
		fetchPosts()
		// Initialize Monaco Editor
		initializeMonaco()
	}, [])

	const initializeMonaco = async () => {
		try {
			// Pre-load common languages for better performance
			await preloadCommonLanguages()
		} catch (error) {
			console.error('Failed to initialize Monaco Editor:', error)
		}
	}

	// Auto-select first post when posts are loaded initially (only once)
	useEffect(() => {
		// Only auto-select on initial load when no post is being edited
		if (editingPostId) return
		
		if (posts.blocks.length === 0 && posts.symbols.length === 0 && posts.scss.length === 0) {
			return // No posts available yet
		}

		// Find first available post across all types
		let firstPost = null
		let firstPostType = null

		if (posts.blocks.length > 0) {
			firstPost = posts.blocks[0]
			firstPostType = 'blocks'
		} else if (posts.symbols.length > 0) {
			firstPost = posts.symbols[0]
			firstPostType = 'symbols'
		} else if (posts.scss.length > 0) {
			firstPost = posts.scss[0]
			firstPostType = 'scss'
		}

		if (firstPost && firstPostType) {
			setActiveTab(firstPostType)
			handleEditPost(firstPost.id)
		}
	}, [posts]) // Only depend on posts, not activeTab or editingPostId

	const resetForm = () => {
		setEditingPostId(null)
		setPostTitle('')
		setPostType('blocks')
		setPostContent('')
		setPostStyle('')
		setPostAttributes('')
		setMessage('')
	}

	const handleTabChange = (tabKey: string) => {
		setActiveTab(tabKey)
		
		// Auto-select first post in the new tab if available
		const postsInTab = posts[tabKey as keyof typeof posts]
		if (postsInTab.length > 0) {
			handleEditPost(postsInTab[0].id, true) // Skip tab update since we're already setting it
		} else {
			// If no posts in this tab, clear the form
			resetForm()
		}
	}

	const handleEditPost = async (postId: number, skipTabUpdate = false) => {
		console.log('handleEditPost called with ID:', postId)
		if (editingPostId && editingPostId !== postId) {
			resetForm()
		}

		setIsLoadingPost(true)
		setMessage('')

		try {
			const response = await fetch(window.fanculo_ajax.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'fanculo_get_post',
					nonce: window.fanculo_ajax.nonce,
					post_id: postId.toString(),
				}),
			})

			const result = await response.json()
			if (result.success) {
				const post = result.data
				console.log('Post loaded successfully:', post)
				setEditingPostId(postId)
				setPostTitle(post.title)
				setPostType(post.type)
				setPostContent(post.content || '')
				setPostStyle(post.style || '')
				setPostAttributes(post.attributes || '')

				// Set the active tab to match the post type (unless we're skipping tab update)
				if (!skipTabUpdate) {
					setActiveTab(post.type)
				}

				document.querySelector('.post-form')?.scrollIntoView({ behavior: 'smooth' })
			} else {
				console.log('Error loading post:', result)
				setMessage('Error loading post data')
			}
		} catch (error) {
			setMessage('Error loading post data')
		} finally {
			setIsLoadingPost(false)
		}
	}

	const handleDeletePost = async () => {
		if (!editingPostId) return

		setIsDeleting(true)
		setMessage('')

		try {
			const response = await fetch(window.fanculo_ajax.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'fanculo_delete_post',
					nonce: window.fanculo_ajax.nonce,
					post_id: editingPostId.toString(),
				}),
			})

			const result = await response.json()
			if (result.success) {
				setMessage(`Post "${postTitle}" deleted successfully!`)
				resetForm()
				fetchPosts()
				setShowDeleteConfirm(false)
			} else {
				setMessage(result.data || 'Error deleting post')
			}
		} catch (error) {
			setMessage('Error deleting post')
		} finally {
			setIsDeleting(false)
		}
	}

	const handleQuickCreate = (type: string) => {
		setQuickCreateType(type)
		setShowModal(true)
		setQuickTitle('')
	}

	// Expose handleQuickCreate to parent component
	useImperativeHandle(ref, () => ({
		handleQuickCreate
	}))

	const handleQuickCreateSubmit = async () => {
		if (!quickTitle.trim()) {
			setMessage('Please enter a title')
			return
		}

		setIsQuickCreating(true)
		setMessage('')

		try {
			const response = await fetch(window.fanculo_ajax.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'fanculo_create_post',
					nonce: window.fanculo_ajax.nonce,
					title: quickTitle,
					type: quickCreateType,
					content: '',
					style: '',
					attributes: '',
				}),
			})

			const result = await response.json()
			if (result.success) {
				setMessage(`${quickCreateType} "${quickTitle}" created successfully!`)
				setShowModal(false)
				setQuickTitle('')
				await fetchPosts()
				setActiveTab(quickCreateType)
				
				// Focus on the newly created post
				if (result.data?.post_id) {
					console.log('Quick create - New post ID:', result.data.post_id)
					// Small delay to ensure the post is available after fetchPosts
					setTimeout(() => {
						console.log('Quick create - Calling handleEditPost for ID:', result.data.post_id)
						handleEditPost(result.data.post_id)
					}, 100)
				}
			} else {
				setMessage(result.data || 'Error creating post')
			}
		} catch (error) {
			setMessage('Error creating post')
		} finally {
			setIsQuickCreating(false)
		}
	}

	const handleCreatePost = async () => {
		if (!postTitle.trim()) {
			setMessage('Please enter a post title')
			return
		}

		const isEditing = editingPostId !== null
		if (isEditing) {
			setIsUpdating(true)
		} else {
			setIsCreating(true)
		}
		setMessage('')

		try {
			const response = await fetch(window.fanculo_ajax.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: isEditing ? 'fanculo_update_post' : 'fanculo_create_post',
					nonce: window.fanculo_ajax.nonce,
					...(isEditing && { post_id: editingPostId.toString() }),
					title: postTitle,
					type: postType,
					content: postContent,
					style: postStyle,
					attributes: postAttributes,
				}),
			})

			const result = await response.json()
			if (result.success) {
				setMessage(`Post "${postTitle}" ${isEditing ? 'updated' : 'created'} successfully!`)
				if (!isEditing) {
					// For new posts, focus on the created post instead of resetting form
					if (result.data?.post_id) {
						console.log('Main create - New post ID:', result.data.post_id)
						await fetchPosts()
						// Small delay to ensure the post is available after fetchPosts
						setTimeout(() => {
							console.log('Main create - Calling handleEditPost for ID:', result.data.post_id)
							handleEditPost(result.data.post_id)
						}, 100)
					} else {
						resetForm()
						fetchPosts()
					}
				} else {
					fetchPosts()
				}
			} else {
				setMessage(result.data || `Error ${isEditing ? 'updating' : 'creating'} post`)
			}
		} catch (error) {
			setMessage(`Error ${isEditing ? 'updating' : 'creating'} post`)
		} finally {
			setIsCreating(false)
			setIsUpdating(false)
		}
	}

	return (
		<div className='flex'>

			{/* Post List Sidebar */}
			<PostListSidebar
				posts={posts}
				activeTab={activeTab}
				isLoadingPosts={isLoadingPosts}
				onTabChange={handleTabChange}
				onEditPost={handleEditPost}
				editingPostId={editingPostId}
			/>

			{/* Main Content */}
			<div className='w-full'>

				{/* Post Creation/Editing Section */}
				{editingPostId && (
					<div className='flex'>
						<div className="post-form w-full mb-10 p-5 border border-gray-300 rounded-lg bg-gray-100 relative">
							{isLoadingPost && (
								<div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg z-10">
									<LoadingSpinner />
								</div>
							)}



							{/* Post Title */}
							<div className="mb-4">
								<h1 
									className="text-xl font-semibold cursor-pointer hover:underline"
									onClick={() => {
										setTempTitle(postTitle)
										setShowTitleModal(true)
									}}
									title="Click to edit title"
								>
									{postTitle || "Click to add title..."}
								</h1>
							</div>

							

							{/* Form Fields Tabs */}
							<TabPanel
								className="fanculo-form-tabs"
								activeClass="is-active"
								tabs={[
									...(postType === 'blocks' || postType === 'symbols' ? [{
										name: 'content',
										title: (
											<span className="flex items-center gap-2">
												<MdOutlineDescription size={16} />
												Content
											</span>
										),
										className: 'tab-content-field'
									}] : []),
									...(postType !== 'symbols' ? [{
										name: 'style',
										title: (
											<span className="flex items-center gap-2">
												<StyleIcon width={16} height={16} />
												Style
											</span>
										),
										className: 'tab-style'
									}] : []),
									...(postType === 'blocks' ? [{
										name: 'attributes',
										title: (
											<span className="flex items-center gap-2">
												<SettingsIcon width={16} height={16} />
												Attributes
											</span>
										),
										className: 'tab-attributes'
									}] : [])
								]}
							>
								{(tab) => (
									<div className="form-tab-content">
										{tab.name === 'content' && (postType === 'blocks' || postType === 'symbols') && (
											<div className="mb-4">												
												<MonacoEditor
													value={postContent}
													onChange={(value) => setPostContent(value || '')}
													language="php"
													theme="vs-dark"
													height="400px"
													placeholder="<?php\n// Enter your PHP render code here\necho 'Hello World';\n?>"
												/>
											</div>
										)}
										
										{tab.name === 'style' && (
											<div className="mb-4">												
												<MonacoEditor
													value={postStyle}
													onChange={(value) => setPostStyle(value || '')}
													language="scss"
													theme="vs-dark"
													height="400px"
													placeholder="// Enter your SCSS styles here\n.my-component {\n  color: #333;\n  padding: 1rem;\n}"
												/>
											</div>
										)}
										
										{tab.name === 'attributes' && postType === 'blocks' && (
											<TextareaControl
												// label="Attributes (JSON)"
												value={postAttributes}
												onChange={(value) => setPostAttributes(value)}
												placeholder='{"title": {"type": "string", "default": ""}, "alignment": {"type": "string", "default": "left"}}'
												rows={8}
												className="wp-textarea-code"
												help="Enter JSON attributes for this block component"
											/>
										)}
									</div>
								)}
							</TabPanel>

							<Button
								variant="primary"
								isBusy={isCreating || isUpdating}
								disabled={isCreating || isUpdating}
								onClick={handleCreatePost}
							>
								{editingPostId
									? (isUpdating ? 'Updating...' : 'Update Post')
									: (isCreating ? 'Creating...' : 'Create Post')
								}
							</Button>
						</div>

						{/* Sidebar */}

						<div className="sidebar min-w-[var(--sidebar-width)]">
							{/* Post Type Display (Edit mode only shows current type) */}
							<div className="mb-4">
								<label className="block mb-2 font-bold">
									Post Type:
								</label>
								<div className="py-2 px-3 bg-green-100 border-2 border-green-500 rounded inline-flex items-center gap-2 text-base font-medium">
									<span>
										{postType === 'blocks' && <BlocksIcon width={20} height={20} />}
										{postType === 'symbols' && <SymbolIcon width={20} height={20} />}
										{postType === 'scss' && <StyleIcon width={20} height={20} />}
									</span>
									<span className="capitalize">{postType}</span>
								</div>
							</div>
							<Button
								variant="secondary"
								isDestructive={true}
								onClick={() => setShowDeleteConfirm(true)}
							>
								Delete Post
							</Button>
						</div>

						{/* Sidebar */}

					</div>
				)}

				{message && (
					<div className={`mt-5 p-2.5 rounded border ${
						message.includes('Error') 
							? 'bg-red-50 border-red-500' 
							: 'bg-green-50 border-green-500'
					}`}>
						{message}
					</div>
				)}
			</div>



			{/* Quick Create Modal */}
			{showModal && (
				<Modal
					title={
						<span className="flex items-center gap-2">
							{quickCreateType === 'blocks' && <BlocksIcon width={20} height={20} />}
							{quickCreateType === 'symbols' && <SymbolIcon width={20} height={20} />}
							{quickCreateType === 'scss' && <StyleIcon width={20} height={20} />}
							{quickCreateType === 'blocks' && 'Create New Block'}
							{quickCreateType === 'symbols' && 'Create New Symbol'}
							{quickCreateType === 'scss' && 'Create New SCSS'}
						</span>
					}
					onRequestClose={() => setShowModal(false)}
					className="fanculo-quick-create-modal"
				>
					<p className="text-gray-600 text-sm mb-4">
						Enter a title for your new {quickCreateType.slice(0, -1)}. You can add content and styles later.
					</p>

					<TextControl
						label="Title:"
						type="text"
						value={quickTitle}
						onChange={(value) => setQuickTitle(value)}
						placeholder={`Enter ${quickCreateType.slice(0, -1)} title...`}
						autoFocus
						onKeyPress={(e) => {
							if (e.key === 'Enter') {
								handleQuickCreateSubmit()
							}
							if (e.key === 'Escape') {
								setShowModal(false)
							}
						}}
					/>

					<div className="flex gap-2.5 justify-end mt-4">
						<Button
							variant="tertiary"
							onClick={() => setShowModal(false)}
							disabled={isQuickCreating}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleQuickCreateSubmit}
							isBusy={isQuickCreating}
							disabled={isQuickCreating || !quickTitle.trim()}
						>
							{isQuickCreating ? 'Creating...' : 'Create'}
						</Button>
					</div>
				</Modal>
			)}

			{/* Title Edit Modal */}
			{showTitleModal && (
				<Modal
					title={
						<span className="flex items-center gap-2">
							<MdOutlineDescription size={20} />
							Edit Post Title
						</span>
					}
					onRequestClose={() => {
						setShowTitleModal(false)
						setTempTitle('')
					}}
					className="fanculo-title-edit-modal"
				>
					<p className="text-gray-600 text-sm mb-4">
						Update the title for this post.
					</p>

					<TextControl
						label="Title:"
						type="text"
						value={tempTitle}
						onChange={(value) => setTempTitle(value)}
						placeholder="Enter post title..."
						autoFocus
						onKeyPress={(e) => {
							if (e.key === 'Enter') {
								setPostTitle(tempTitle)
								setShowTitleModal(false)
								setTempTitle('')
							}
							if (e.key === 'Escape') {
								setShowTitleModal(false)
								setTempTitle('')
							}
						}}
					/>

					<div className="flex gap-2.5 justify-end mt-4">
						<Button
							variant="tertiary"
							onClick={() => {
								setShowTitleModal(false)
								setTempTitle('')
							}}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={() => {
								setPostTitle(tempTitle)
								setShowTitleModal(false)
								setTempTitle('')
							}}
							disabled={!tempTitle.trim()}
						>
							Save
						</Button>
					</div>
				</Modal>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<Modal
					title="🗑️ Delete Post"
					onRequestClose={() => setShowDeleteConfirm(false)}
					className="fanculo-delete-confirm-modal"
					isDismissible={!isDeleting}
				>
					<p className="text-gray-600 text-sm mb-4">
						Are you sure you want to delete "<strong>{postTitle}</strong>"? This action cannot be undone.
					</p>

					<div className="flex gap-2.5 justify-end mt-4">
						<Button
							variant="tertiary"
							onClick={() => setShowDeleteConfirm(false)}
							disabled={isDeleting}
						>
							Cancel
						</Button>
						<Button
							variant="secondary"
							isDestructive={true}
							onClick={handleDeletePost}
							isBusy={isDeleting}
							disabled={isDeleting}
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</Button>
					</div>
				</Modal>
			)}
		</div>
	)
})

export default EditorPage