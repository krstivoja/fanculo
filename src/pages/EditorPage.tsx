import { useState, useEffect, Suspense, forwardRef, useImperativeHandle } from 'react'
import LoadingSpinner from '../ui/components/LoadingSpinner'

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
	}, [])

	// Auto-select first post when posts are loaded
	useEffect(() => {
		if (!editingPostId && posts.blocks.length === 0 && posts.symbols.length === 0 && posts.scss.length === 0) {
			return // No posts available yet
		}

		if (!editingPostId) {
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
		}
	}, [posts, editingPostId])

	const resetForm = () => {
		setEditingPostId(null)
		setPostTitle('')
		setPostType('blocks')
		setPostContent('')
		setPostStyle('')
		setPostAttributes('')
		setMessage('')
	}

	const handleEditPost = async (postId: number) => {
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

			{/* Sidebar with Tabs */}
			<div className='min-w-[var(--sidebar-width)] p-4'>
				{/* Tab Navigation */}
				<div className="flex border border-solid border-slate-500 rounded-sm overflow-hidden p-1">
					{[
						{ key: 'blocks', label: 'Blocks' },
						{ key: 'symbols', label: 'Symbols' },
						{ key: 'scss', label: 'SCSS' },
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`flex-1 cursor-pointer !text-[12px] transition-all duration-300 p-1 ${
								activeTab === tab.key 
									? 'text-white  bg-black rounded-sm'
									: 'text-gray-600'
							}`}
						>
							{tab.label} ({posts[tab.key as keyof typeof posts].length})
						</button>
					))}
				</div>

				{/* Tab Content */}
				<div className="border border-gray-300 rounded-b-lg bg-white min-h-[var(--sidebar-width)]">
					{isLoadingPosts ? (
						<div className="py-10 px-10 text-center text-gray-600">
							Loading posts...
						</div>
					) : (
						<div className="p-4">
							{posts[activeTab as keyof typeof posts].length === 0 ? (
								<div className="text-center text-gray-600 italic py-10 px-5">
									<div className="text-5xl mb-2">
										{activeTab === 'blocks' && '🧱'}
										{activeTab === 'symbols' && '🔣'}
										{activeTab === 'scss' && '🎨'}
									</div>
									No {activeTab} yet
									<div className="text-xs mt-2">
										Create your first {activeTab.slice(0, -1)} using the Quick Create button in the top navigation
									</div>
								</div>
							) : (
								posts[activeTab as keyof typeof posts].map((post: any) => (
									<div 
										key={post.id} 
										className="p-3 border-b border-gray-200 flex justify-between items-center transition-colors duration-200 hover:bg-gray-50"
									>
										<div>
											<div className="font-medium mb-1">
												{post.title}
											</div>
											<div className="text-xs text-gray-600">
												{new Date(post.date).toLocaleDateString()}
											</div>
										</div>
										<button
											onClick={() => handleEditPost(post.id)}
											className={`text-xs py-1.5 px-3 border rounded transition-all duration-200 cursor-pointer bg-transparent ${
												activeTab === 'blocks' ? 'text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white' :
												activeTab === 'symbols' ? 'text-green-700 border-green-700 hover:bg-green-700 hover:text-white' :
												'text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white'
											}`}
										>
											Edit ✏️
										</button>
									</div>
								))
							)}
						</div>
					)}
				</div>
			</div>

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



							<div className="mb-4">
								<label className="block mb-1 font-bold">
									Post Title:
								</label>
								<input
									type="text"
									value={postTitle}
									onChange={(e) => setPostTitle(e.target.value)}
									placeholder="Enter post title..."
									className="p-2 w-full border border-gray-300 rounded text-base"
								/>
							</div>

							{/* Post Type Display (Edit mode only shows current type) */}
							<div className="mb-4">
								<label className="block mb-2 font-bold">
									Post Type:
								</label>
								<div className="py-2 px-3 bg-green-100 border-2 border-green-500 rounded inline-flex items-center gap-2 text-base font-medium">
									<span>
										{postType === 'blocks' && '🧱'}
										{postType === 'symbols' && '🔣'}
										{postType === 'scss' && '🎨'}
									</span>
									<span className="capitalize">{postType}</span>
								</div>
							</div>

							{/* Content Field (Blocks & Symbols) */}
							{(postType === 'blocks' || postType === 'symbols') && (
								<div className="mb-4">
									<label className="block mb-1 font-bold">
										📝 Content:
									</label>
									<textarea
										value={postContent}
										onChange={(e) => setPostContent(e.target.value)}
										placeholder="Enter HTML/JSX content..."
										rows={6}
										className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
									/>
								</div>
							)}

							{/* Style Field (All types) */}
							<div className="mb-4">
								<label className="block mb-1 font-bold">
									🎨 Style:
								</label>
								<textarea
									value={postStyle}
									onChange={(e) => setPostStyle(e.target.value)}
									placeholder="Enter CSS/SCSS styles..."
									rows={6}
									className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
								/>
							</div>

							{/* Attributes Field (Blocks only) */}
							{postType === 'blocks' && (
								<div className="mb-4">
									<label className="block mb-1 font-bold">
										⚙️ Attributes:
									</label>
									<textarea
										value={postAttributes}
										onChange={(e) => setPostAttributes(e.target.value)}
										placeholder='{"prop1": "default", "prop2": true}'
										rows={4}
										className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
									/>
								</div>
							)}

							<button
								onClick={handleCreatePost}
								disabled={isCreating || isUpdating}
								className={`py-3 px-6 text-white border-none rounded text-base font-bold ${
									(isCreating || isUpdating) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 cursor-pointer'
								}`}
							>
								{editingPostId
									? (isUpdating ? 'Updating...' : 'Update Post')
									: (isCreating ? 'Creating...' : 'Create Post')
								}
							</button>
						</div>
						<div className="sidebar min-w-[var(--sidebar-width)]">
							<button
								onClick={() => setShowDeleteConfirm(true)}
								className="py-2 px-4 bg-red-700 text-white border-none rounded cursor-pointer text-sm"
							>
								Delete Post
							</button>
						</div>
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
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
					<div className="bg-white p-8 rounded-xl shadow-2xl min-w-[400px] max-w-[500px]">
						<div className="mb-5">
							<h3 className="m-0 mb-2 text-xl text-gray-800">
								{quickCreateType === 'blocks' && '🧱 Create New Block'}
								{quickCreateType === 'symbols' && '🔣 Create New Symbol'}
								{quickCreateType === 'scss' && '🎨 Create New SCSS'}
							</h3>
							<p className="m-0 text-gray-600 text-sm">
								Enter a title for your new {quickCreateType.slice(0, -1)}. You can add content and styles later.
							</p>
						</div>

						<div className="mb-5">
							<label className="block mb-2 font-medium text-gray-800">
								Title:
							</label>
							<input
								type="text"
								value={quickTitle}
								onChange={(e) => setQuickTitle(e.target.value)}
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
								className="w-full p-3 border-2 border-gray-300 rounded-md text-base outline-none box-border"
							/>
						</div>

						<div className="flex gap-2.5 justify-end">
							<button
								onClick={() => setShowModal(false)}
								disabled={isQuickCreating}
								className={`py-2.5 px-5 border-2 border-gray-300 rounded-md bg-white text-gray-600 text-sm font-medium ${
									isQuickCreating ? 'cursor-not-allowed' : 'cursor-pointer'
								}`}
							>
								Cancel
							</button>
							<button
								onClick={handleQuickCreateSubmit}
								disabled={isQuickCreating || !quickTitle.trim()}
								className={`py-2.5 px-5 border-none rounded-md text-white text-sm font-medium ${
									(isQuickCreating || !quickTitle.trim()) 
										? 'bg-gray-400 cursor-not-allowed' 
										: quickCreateType === 'blocks' 
											? 'bg-blue-600 cursor-pointer'
											: quickCreateType === 'symbols'
												? 'bg-green-700 cursor-pointer'
												: 'bg-orange-600 cursor-pointer'
								}`}
							>
								{isQuickCreating ? 'Creating...' : 'Create'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
					<div className="bg-white p-8 rounded-xl shadow-2xl min-w-[400px] max-w-[500px]">
						<div className="mb-5">
							<h3 className="m-0 mb-2 text-xl text-red-700">
								🗑️ Delete Post
							</h3>
							<p className="m-0 text-gray-600 text-sm">
								Are you sure you want to delete "<strong>{postTitle}</strong>"? This action cannot be undone.
							</p>
						</div>

						<div className="flex gap-2.5 justify-end">
							<button
								onClick={() => setShowDeleteConfirm(false)}
								disabled={isDeleting}
								className={`py-2.5 px-5 border-2 border-gray-300 rounded-md bg-white text-gray-600 text-sm font-medium ${
									isDeleting ? 'cursor-not-allowed' : 'cursor-pointer'
								}`}
							>
								Cancel
							</button>
							<button
								onClick={handleDeletePost}
								disabled={isDeleting}
								className={`py-2.5 px-5 border-none rounded-md text-white text-sm font-medium ${
									isDeleting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-700 cursor-pointer'
								}`}
							>
								{isDeleting ? 'Deleting...' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
})

export default EditorPage