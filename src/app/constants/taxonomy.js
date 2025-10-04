import BlockIcon from '../components/icons/BlockIcon';
import SymbolIcon from '../components/icons/SymbolIcon';
import StyleIcon from '../components/icons/StyleIcon';

export const TAXONOMY_TERMS = [
    {
        slug: 'blocks',
        name: 'Blocks',
        icon: BlockIcon,
        description: 'Core structural components that define the layout and content framework in Gutenberg.'
    },
    {
        slug: 'symbols',
        name: 'Symbols',
        icon: SymbolIcon,
        description: 'Reusable PHP elements that can be embedded into blocks to avoid repeating functional components like buttons or forms.'
    },
    {
        slug: 'scss-partials',
        name: 'SCSS Partials',
        icon: StyleIcon,
        description: 'Reusable styling fragments that ensure consistent design across multiple blocks and symbols.'
    }
];