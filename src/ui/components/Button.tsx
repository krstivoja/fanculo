import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode
	variant?: 'primary' | 'secondary' | 'destructive'
	size?: 'sm' | 'md'
	loading?: boolean
}

const Button = ({ 
	children, 
	variant = 'primary', 
	size = 'md', 
	loading = false,
	disabled,
	className = '',
	...props 
}: ButtonProps) => {
	const baseClasses = 'border-none rounded cursor-pointer font-medium transition-all duration-200 inline-flex items-center justify-center'
	
	const variantClasses = {
		primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400',
		secondary: 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400',
		destructive: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-gray-400'
	}
	
	const sizeClasses = {
		sm: 'py-2 px-4 text-sm',
		md: 'py-3 px-6 text-base'
	}
	
	const isDisabled = disabled || loading
	
	return (
		<button
			{...props}
			disabled={isDisabled}
			className={`
				${baseClasses}
				${variantClasses[variant]}
				${sizeClasses[size]}
				${isDisabled ? 'cursor-not-allowed' : ''}
				${className}
			`.trim().replace(/\s+/g, ' ')}
		>
			{loading ? (
				<>
					<svg 
						className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
						xmlns="http://www.w3.org/2000/svg" 
						fill="none" 
						viewBox="0 0 24 24"
					>
						<circle 
							className="opacity-25" 
							cx="12" 
							cy="12" 
							r="10" 
							stroke="currentColor" 
							strokeWidth="4"
						/>
						<path 
							className="opacity-75" 
							fill="currentColor" 
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					{typeof children === 'string' && children.includes('...') ? children : `${children}...`}
				</>
			) : (
				children
			)}
		</button>
	)
}

export default Button