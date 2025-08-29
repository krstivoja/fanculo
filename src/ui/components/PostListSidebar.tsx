import { TabPanel } from '@wordpress/components'
import { BlocksIcon, SymbolIcon, StyleIcon } from '../icons/Icons.jsx'
import LoadingSpinner from './LoadingSpinner'
import './PostListSidebar.scss';

interface Post {
	id: number
	title: string
	type: string
	content: string
	style: string
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
		<div className='w-[var(--sidebar-width)] p-4'>
			<TabPanel
				className="fanculo-tab-panel"
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
									{/* <span className='text-[10px] bg-slate-300 px-1 py-0 rounded-md'>{posts.blocks.length}</span> */}
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
									{/* <span className='text-[10px] bg-slate-300 px-1 py-0 rounded-md'>{posts.symbols.length}</span>									 */}
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
									{/* <span className='text-[10px] bg-slate-300 px-1 py-0 rounded-md'>{posts.scss.length}</span>									 */}
								</span>
							</span>
						),
						className: 'tab-scss'
					}
				]}
			>
				{(tab) => (
					<div className="tab-content min-h-[var(--sidebar-width)]">
						{isLoadingPosts ? (
							<div className="py-10 px-10 text-center text-gray-600">
								Loading posts...
							</div>
						) : (
							<div>
								{posts[tab.name as keyof typeof posts].length === 0 ? (
									<div className="text-center text-gray-600 italic py-10 px-5">
										<div className="mb-4 flex justify-center">
											{tab.name === 'blocks' && <BlocksIcon width={48} height={48} className="text-gray-400" />}
											{tab.name === 'symbols' && <SymbolIcon width={48} height={48} className="text-gray-400" />}
											{tab.name === 'scss' && <StyleIcon width={48} height={48} className="text-gray-400" />}
										</div>
										No {tab.name} yet
										<div className="text-xs mt-2">
											Create your first {tab.name.slice(0, -1)} using the Quick Create button in the top navigation
										</div>
									</div>
								) : (
									posts[tab.name as keyof typeof posts].map((post: any) => (
										<button
											key={post.id} 
											className={`w-full cursor-pointer text-left p-3 border-b border-gray-200 flex justify-between items-center transition-colors duration-200 hover:bg-gray-50 ${
												editingPostId === post.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
											}`}
											onClick={() => onEditPost(post.id)}
										>
											{post.title}
										</button>
									))
								)}
							</div>
						)}
					</div>
				)}
			</TabPanel>
		</div>
	)
}