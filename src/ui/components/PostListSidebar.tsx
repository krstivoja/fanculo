import { TabPanel } from '@wordpress/components'
import { BlocksIcon, SymbolIcon, StyleIcon } from '../icons/Icons.jsx'
import LoadingSpinner from './LoadingSpinner'
import './PostListSidebar.css';

interface Post {
	id: number
	title: string
	type: string
	content: string
	style: string
	icon: string
}

interface PostListSidebarProps {
	posts: {
		blocks: Post[]
		symbols: Post[]
		scss: Post[]
	}
	activeTab: string
	isLoadingPosts: boolean
	onTabChange: (tabName: string) => void
	onEditPost: (postId: number) => void
	editingPostId: number | null
}

export default function PostListSidebar({
	posts,
	activeTab,
	isLoadingPosts,
	onTabChange,
	onEditPost,
	editingPostId
}: PostListSidebarProps) {
	return (
		
			<aside id='post-list' className='w-full max-w-sidebar px-2 py-4 border-r border-solid border-ui-outline'>
			<TabPanel
				className="w-full"
				activeClass="is-active"
				onSelect={(tabName) => onTabChange(tabName)}
				initialTabName={activeTab}
				tabs={[
					{
						name: 'blocks',
						title: (
							<span className="flex items-center gap-2">
								<BlocksIcon width={16} height={16} />
								<span className='!text-xxs flex gap-1'>
									Blocks 
									{/* <span className='text-[10px] bg-stone-300 px-1 py-0 rounded-md'>{posts.blocks.length}</span> */}
								</span>
							</span>
						),
						className: 'tab-blocks'
					},
					{
						name: 'symbols',
						title: (
							<span className="flex items-center gap-2">
								<SymbolIcon width={16} height={16} />
								<span className='!text-xxs'>
									Symbols 
									{/* <span className='text-[10px] bg-stone-300 px-1 py-0 rounded-md'>{posts.symbols.length}</span>									 */}
								</span>
							</span>
						),
						className: 'tab-symbols'
					},
					{
						name: 'scss',
						title: (
							<span className="flex items-center gap-2">
								<StyleIcon width={16} height={16} />
								<span className='!text-xxs'>SCSS 
									{/* <span className='text-[10px] bg-stone-300 px-1 py-0 rounded-md'>{posts.scss.length}</span>									 */}
								</span>
							</span>
						),
						className: 'tab-scss'
					}
				]}
			>
				{(tab) => (
					<div className="tab-content w-full mt-2 overflow-scroll" style={{maxHeight: 'var(--sidebar-max-height)'}}>
						{isLoadingPosts ? (
							<div className="py-10 px-10 text-center text-gray-600">
								Loading posts...
							</div>
						) : (
							<>
								{posts[tab.name as keyof typeof posts].length === 0 ? (
									<>
										<div className="mb-4 flex justify-center ">
											{tab.name === 'blocks' && <BlocksIcon />}
											{tab.name === 'symbols' && <SymbolIcon />}
											{tab.name === 'scss' && <StyleIcon />}
										</div>
										No {tab.name} yet
										<div className="text-xs mt-2">
											Create your first {tab.name.slice(0, -1)} using the Quick Create button in the top navigation
										</div>
									</>
								) : (
									posts[tab.name as keyof typeof posts].map((post: any) => (
										<button
											key={post.id} 
											className={`w-full cursor-pointer text-left p-2 flex justify-between items-center transition-colors duration-200 rounded-sm hover:bg-stone-100 ${
												editingPostId === post.id ? 'bg-blue-500 text-white border hover:!bg-blue-500 cursor-auto' : ''
											}`}
											onClick={() => onEditPost(post.id)}
										>
											<div className="flex items-center gap-2">
												{post.icon && (
													<span className={`dashicons dashicons-${post.icon} text-sm`}></span>
												)}
												{post.title}
											</div>
										</button>
									))
								)}
							</>
						)}
					</div>
				)}
			</TabPanel>
			</aside>
	)
}