export default function TrashIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 4h3c.6 0 1 .4 1 1s-.4 1-1 1h-1v10c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V6H5c-.6 0-1-.4-1-1s.4-1 1-1h3c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2zM8 6v8h1V6H8zm3 0v8h1V6h-1z"
        fill="currentColor"
      />
    </svg>
  );
}
