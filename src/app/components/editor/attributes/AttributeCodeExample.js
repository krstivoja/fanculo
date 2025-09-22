import React, { useState } from 'react';
import { Button } from '../../ui';
import { getPhpExample } from '../../../utils/phpExamples';

/**
 * Component for displaying PHP code examples for attributes
 * @param {Object} props - Component props
 * @param {Object} props.attribute - Attribute object
 * @param {number} props.attributeIndex - Index of the attribute
 * @returns {JSX.Element} AttributeCodeExample component
 */
const AttributeCodeExample = ({ attribute, attributeIndex }) => {
    const [copied, setCopied] = useState(false);

    const codeExample = getPhpExample(attribute);

    const handleCopy = async () => {
        try {
            // Check if clipboard API is available
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(codeExample);
            } else {
                // Fallback for non-HTTPS environments
                const textArea = document.createElement('textarea');
                textArea.value = codeExample;
                textArea.style.position = 'absolute';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
            // Show user-friendly message
            alert('Copy failed. Please manually copy the code.');
        }
    };

    if (!attribute.name) {
        return null;
    }

    return (
        <div className="mt-4">
            <pre className="relative !bg-[black] rounded-md">
                <span className="hljs mb-0 p-4 pr-12 block min-h-full overflow-auto">
                    <code className="!text-xs !p-0 whitespace-pre-wrap">
                        {codeExample}
                    </code>
                </span>
                <Button
                    variant="secondary"
                    onClick={handleCopy}
                    className="absolute top-2 right-2 is-secondary is-small"
                    aria-label="Copy code"
                    title="Copy code"
                >
                    <span className="dashicon dashicons dashicons-admin-page"></span>
                    {copied ? 'Copied!' : 'Copy'}
                </Button>
            </pre>
        </div>
    );
};

export default AttributeCodeExample;