<?php
namespace Fanculo\FilesManager\Files\Fields;


class Components {
    public static function generateInput($attr, $attributes, $setAttributes) {
        $type = $attr['type'] ?? 'text';
        
        switch ($type) {
            case 'text':
                return Text::generate($attr, $attributes, $setAttributes);
            case 'number':
                return Number::generate($attr, $attributes, $setAttributes);
            case 'date':
                return Date::generate($attr, $attributes, $setAttributes);
            case 'link':
                return Link::generate($attr, $attributes, $setAttributes);
            case 'color':
                return Color::generate($attr, $attributes, $setAttributes);
            case 'richText':
                return RichText::generate($attr, $attributes, $setAttributes);
            case 'select':
                return Select::generate($attr, $attributes, $setAttributes);
            case 'range':
                return Range::generate($attr, $attributes, $setAttributes);
            case 'textarea':
                return Textarea::generate($attr, $attributes, $setAttributes);
            case 'toggle':
                return Toggle::generate($attr, $attributes, $setAttributes);
            case 'checkbox':
                return Checkbox::generate($attr, $attributes, $setAttributes);
            case 'radio':
                return Radio::generate($attr, $attributes, $setAttributes);
            case 'image':
                return Image::generate($attr, $attributes, $setAttributes);
            default:
                return Text::generate($attr, $attributes, $setAttributes);
        }
    }

    public static function generatePanel($title, $children) {
        return Panel::generate($title, $children);
    }
} 