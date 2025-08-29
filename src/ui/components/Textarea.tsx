import { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string
	error?: string
	helpText?: string
	variant?: 'default' | 'code'
	className?: string
}

const Textarea = ({ 
	label,
	error,
	helpText,
	variant = 'default',
	className = '',
	...props 
}: TextareaProps) => {
	const baseClasses = 'p-2 w-full border rounded text-sm transition-colors duration-200 resize-vertical'
	const stateClasses = error 
		? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-200' 
		: 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
	
	const variantClasses = variant === 'code' ? 'font-mono' : ''
	
	return (
		<div className="mb-4">
			{label && (
				<label className="block mb-1 font-bold text-gray-700">
					{label}
				</label>
			)}
			<textarea
				{...props}
				className={`
					${baseClasses}
					${stateClasses}
					${variantClasses}
					${props.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
					${className}
				`.trim().replace(/\s+/g, ' ')}
			/>
			{error && (
				<p className="mt-1 text-sm text-red-600">
					{error}
				</p>
			)}
			{helpText && !error && (
				<p className="mt-1 text-sm text-gray-500">
					{helpText}
				</p>
			)}
		</div>
	)
}

export default Textarea