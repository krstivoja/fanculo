import { useState, useEffect, Suspense, forwardRef, useImperativeHandle } from 'react'
import LoadingSpinner from '../ui/components/LoadingSpinner'
import PostListSidebar from '../ui/components/PostListSidebar'
import MonacoEditor from '../ui/components/MonacoEditor'
import QuickCreateModal from '../ui/components/modals/QuickCreateModal'
import TitleEditModal from '../ui/components/modals/TitleEditModal'
import DeleteConfirmModal from '../ui/components/modals/DeleteConfirmModal'
import { Button, TextareaControl, TabPanel, ToggleControl, SelectControl } from '@wordpress/components'
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
	const [postEditorStyle, setPostEditorStyle] = useState('')
	const [postViewJs, setPostViewJs] = useState('')
	const [postDescription, setPostDescription] = useState('')
	const [postCategory, setPostCategory] = useState('')
	const [isCreating, setIsCreating] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)
	const [isLoadingPost, setIsLoadingPost] = useState(false)

	// Posts list state
	const [allPosts, setAllPosts] = useState<any[]>([])
	const [isLoadingPosts, setIsLoadingPosts] = useState(false)
	const [activeTab, setActiveTab] = useState('blocks')
	
	// Filter posts by type for display
	const posts = {
		blocks: allPosts.filter(post => post.type === 'blocks'),
		symbols: allPosts.filter(post => post.type === 'symbols'),
		scss: allPosts.filter(post => post.type === 'scss')
	}

	// Modal states
	const [showQuickCreateModal, setShowQuickCreateModal] = useState(false)
	const [quickCreateType, setQuickCreateType] = useState('')
	const [isQuickCreating, setIsQuickCreating] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [showTitleModal, setShowTitleModal] = useState(false)

	// Toggle states for Editor Style and View JS tabs
	const [enableEditorStyle, setEnableEditorStyle] = useState(false)
	const [enableViewJs, setEnableViewJs] = useState(false)

	// Block categories
	const [blockCategories, setBlockCategories] = useState<any[]>([])

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
				// Flatten the grouped posts into a single array
				const flatPosts = [
					...result.data.blocks.map((post: any) => ({ ...post, type: 'blocks' })),
					...result.data.symbols.map((post: any) => ({ ...post, type: 'symbols' })),
					...result.data.scss.map((post: any) => ({ ...post, type: 'scss' }))
				]
				setAllPosts(flatPosts)
			}
		} catch (error) {
			console.error('Error fetching posts:', error)
		} finally {
			setIsLoadingPosts(false)
		}
	}

	const fetchBlockCategories = async () => {
		try {
			const response = await fetch(window.fanculo_ajax.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'fanculo_get_block_categories',
					nonce: window.fanculo_ajax.nonce,
				}),
			})

			const result = await response.json()
			if (result.success) {
				setBlockCategories(result.data)
			}
		} catch (error) {
			console.error('Error fetching block categories:', error)
		}
	}

	useEffect(() => {
		fetchPosts()
		fetchBlockCategories()
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

	// Auto-select first available post on initial load only
	useEffect(() => {
		if (editingPostId || allPosts.length === 0) return
		
		// Find first post and auto-select it
		const firstPost = allPosts[0]
		if (firstPost) {
			setActiveTab(firstPost.type)
			handleEditPost(firstPost.id)
		}
	}, [allPosts]) // Only run when allPosts changes

	const resetForm = () => {
		setEditingPostId(null)
		setPostTitle('')
		setPostType('blocks')
		setPostContent('')
		setPostStyle('')
		setPostAttributes('')
		setPostEditorStyle('')
		setPostViewJs('')
		setPostDescription('')
		setPostCategory('')
		setEnableEditorStyle(false)
		setEnableViewJs(false)
		setMessage('')
	}

	const handleTabChange = (tabKey: string) => {
		setActiveTab(tabKey)
		// Don't auto-select posts - let user choose
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
				setPostEditorStyle(post.editor_style || '')
				setPostViewJs(post.view_js || '')
				setPostDescription(post.description || '')
				setPostCategory(post.category || '')
				
				// Set toggle states from saved values
				if (post.type === 'blocks') {
					setEnableEditorStyle(post.enable_editor_style || false)
					setEnableViewJs(post.enable_view_js || false)
				}

				// Auto-switch to the correct tab for this post type
				setActiveTab(post.type)

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
		setShowQuickCreateModal(true)
	}

	// Expose handleQuickCreate to parent component
	useImperativeHandle(ref, () => ({
		handleQuickCreate
	}))

	const handleQuickCreateSubmit = async (title: string) => {
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
					title: title,
					type: quickCreateType,
					content: '',
					style: '',
					attributes: '',
					editor_style: '',
					view_js: '',
					description: '',
					category: '',
					enable_editor_style: 'false',
					enable_view_js: 'false',
				}),
			})

			const result = await response.json()
			if (result.success) {
				setMessage(`${quickCreateType} "${title}" created successfully!`)
				setShowQuickCreateModal(false)
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
					editor_style: postEditorStyle,
					view_js: postViewJs,
					description: postDescription,
					category: postCategory,
					enable_editor_style: enableEditorStyle.toString(),
					enable_view_js: enableViewJs.toString(),
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
				{editingPostId ? (
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
									className="!text-4xl !font-bold cursor-pointer hover:underline"
									onClick={() => setShowTitleModal(true)}
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
									...(postType === 'blocks' || postType === 'scss' ? [{
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
									}] : []),
									...(postType === 'blocks' && enableEditorStyle ? [{
										name: 'editor_style',
										title: (
											<span className="flex items-center gap-2">
												<StyleIcon width={16} height={16} />
												Editor Style
											</span>
										),
										className: 'tab-editor-style'
									}] : []),
									...(postType === 'blocks' && enableViewJs ? [{
										name: 'view_js',
										title: (
											<span className="flex items-center gap-2">
												<MdOutlineDescription size={16} />
												View JS
											</span>
										),
										className: 'tab-view-js'
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
										
										{tab.name === 'editor_style' && postType === 'blocks' && (
											<div className="mb-4">
												<MonacoEditor
													value={postEditorStyle}
													onChange={(value) => setPostEditorStyle(value || '')}
													language="scss"
													theme="vs-dark"
													height="400px"
													placeholder="// Editor-specific styles for this block
.wp-block-editor .my-block {
  border: 2px dashed #ccc;
  padding: 1rem;
}"
												/>
											</div>
										)}
										
										{tab.name === 'view_js' && postType === 'blocks' && (
											<div className="mb-4">
												<MonacoEditor
													value={postViewJs}
													onChange={(value) => setPostViewJs(value || '')}
													language="javascript"
													theme="vs-dark"
													height="400px"
													placeholder="// Frontend JavaScript for this block
document.addEventListener('DOMContentLoaded', function() {
  // Your block's frontend code here
  console.log('Block loaded on frontend');
});"
												/>
											</div>
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

							{/* Block Description - Only for blocks */}
							{postType === 'blocks' && (
								<div className="mb-4">
									<TextareaControl
										label="Block Description"
										value={postDescription}
										onChange={(value) => setPostDescription(value || '')}
										placeholder="Enter a description for this block..."
										rows={3}
										help="Optional description to help identify and understand this block's purpose"
									/>
								</div>
							)}

							{/* Block Category - Only for blocks */}
							{postType === 'blocks' && (
								<div className="mb-4">
									<SelectControl
										label="Block Category"
										value={postCategory}
										onChange={(value) => setPostCategory(value || '')}
										options={[
											{ label: 'Select a category...', value: '' },
											...blockCategories.map(category => ({
												label: category.title,
												value: category.slug
											}))
										]}
										help="Choose the Gutenberg category for this block"
									/>
								</div>
							)}

							{/* Toggle Controls for Blocks only */}
							{postType === 'blocks' && (
								<div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
									<h3 className="text-sm font-semibold mb-3 text-gray-700">Additional Fields</h3>
									<div className="space-y-2">
										<ToggleControl
											label="Editor Style"
											help={enableEditorStyle ? "Styles for the editor environment" : "Enable editor-specific CSS"}
											checked={enableEditorStyle}
											onChange={setEnableEditorStyle}
										/>
										<ToggleControl
											label="View JS"
											help={enableViewJs ? "Frontend JavaScript for this block" : "Enable frontend JavaScript"}
											checked={enableViewJs}
											onChange={setEnableViewJs}
										/>
									</div>
								</div>
							)}

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
				) : null}

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



			{/* Modals */}
			<QuickCreateModal
				isOpen={showQuickCreateModal}
				type={quickCreateType}
				onClose={() => setShowQuickCreateModal(false)}
				onSubmit={handleQuickCreateSubmit}
				isCreating={isQuickCreating}
			/>

			<TitleEditModal
				isOpen={showTitleModal}
				currentTitle={postTitle}
				onClose={() => setShowTitleModal(false)}
				onSave={setPostTitle}
			/>

			<DeleteConfirmModal
				isOpen={showDeleteConfirm}
				postTitle={postTitle}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={handleDeletePost}
				isDeleting={isDeleting}
			/>
		</div>
	)
})

export default EditorPage