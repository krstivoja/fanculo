## step 1
on save we should first check if forder "fanculo-blocks" exist in /wp-content/plugins/ if not we need to create one. 

## step 2

1. inside order "fanculo-blocks" we need to create folders "scss" and "symbols"
2. in "scss" we need to create .scss files based on post type fanculo type "scss partials" and file names should be based on post slug
- Add content based on scss meta
3. in "symbols" we need to create .php files based on post type fanculo type "symbols" and file names should be based on post slug
- Add content based on php meta
4. for post type blocks we need to create folders for each post based on post slug
- inside folders we need to have files:
    - renden.php - based on php meta
    - view.js - based on javascript meta
    - style.scss - based on scss meta
    - block.json - based on plugins settings

## notes 
- if post is renamed we need to rename files or folders
    - if scss partial is renamed we need to rename the file {slug}.scss
    - if symbols is renamed we need to rename the file {slug}.php
    - if block is renamed we need to rename folder
- also track if post is renamed we need to remove old files and folders so we do not have duplicates
