import { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string
	error?: string
	helpText?: string
	className?: string
}

const Input = ({ 
	label,
	error,
	helpText,
	className = '',
	...props 
}: InputProps) => {
	const baseClasses = 'p-2 w-full border rounded text-base transition-colors duration-200'
	const stateClasses = error 
		? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-200' 
		: 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
	
	return (
		<div className="mb-4">
			{label && (
				<label className="block mb-1 font-bold text-gray-700">
					{label}
				</label>
			)}
			<input
				{...props}
				className={`
					${baseClasses}
					${stateClasses}
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

export default Input